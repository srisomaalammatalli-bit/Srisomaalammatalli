import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return sendUnauthorized(res, 'Authentication required to view audit logs.');
    }

    const { limit = 100 } = req.query;
    const result = await query(
      `SELECT id, user_id, user_name, action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_logs 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [Number(limit)]
    );

    return sendSuccess(res, { logs: result.rows });
  } catch (err) {
    console.error('[Audit GET Error]', err);
    return sendError(res, 'Failed to fetch audit logs.');
  }
}
