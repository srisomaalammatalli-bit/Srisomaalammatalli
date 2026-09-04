import { query } from '../_lib/db.js';
import { sendSuccess } from '../_lib/response.js';
import { getAuthenticatedUser, clearSessionCookie } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  try {
    const user = await getAuthenticatedUser(req);
    if (user && user.sessionId) {
      await query(`DELETE FROM sessions WHERE id = $1`, [user.sessionId]);
      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Admin Logout',
        entityType: 'AUTH',
        entityId: user.id,
        req
      });
    }

    clearSessionCookie(res);
    return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
  } catch (err) {
    clearSessionCookie(res);
    return sendSuccess(res, { loggedOut: true });
  }
}
