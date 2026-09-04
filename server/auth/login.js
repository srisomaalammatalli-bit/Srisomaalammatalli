import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { verifyPassword, createSession, setSessionCookie } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return sendBadRequest(res, 'Mobile/Email and password are required.');
    }

    const cleanId = String(identifier).trim();

    // Query user by mobile or email
    const result = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.password_hash, u.status, r.id as role_id, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE (u.mobile = $1 OR u.email = $1) AND u.status = 'Active'`,
      [cleanId]
    );

    if (result.rows.length === 0) {
      return sendUnauthorized(res, 'Invalid mobile number or credentials.');
    }

    const user = result.rows[0];
    const passwordMatch = await verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return sendUnauthorized(res, 'Invalid mobile number or credentials.');
    }

    // Create session and set HTTP-only cookie
    const { rawToken, expiresAt } = await createSession(user.id, req);
    setSessionCookie(res, rawToken, expiresAt);

    // Update last_active
    await query(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    // Log to immutable audit
    await logAudit(query, {
      userId: user.id,
      userName: user.name,
      action: 'Admin Login',
      entityType: 'AUTH',
      entityId: user.id,
      metadata: { role: user.role_id },
      req
    });

    return sendSuccess(res, {
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role_id,
        roleName: user.role_name
      }
    }, 'Authentication successful');
  } catch (err) {
    console.error('[Login API Error]', err);
    return sendError(res, 'An error occurred during authentication.');
  }
}
