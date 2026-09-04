import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, name, mobile, email, role, status, avatar_bg, display_order, last_active 
         FROM committee_members 
         WHERE status = 'Active' 
         ORDER BY display_order ASC`
      );
      return sendSuccess(res, { committee: result.rows });
    } catch (err) {
      console.error('[Committee GET Error]', err);
      return sendError(res, 'Failed to fetch committee members.');
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user || user.role !== 'super_admin') {
        return sendUnauthorized(res, 'Only Super Admins can add committee trustees.');
      }

      const { name, mobile, email, role } = req.body || {};

      if (!name || !mobile || !role) {
        return sendBadRequest(res, 'Name, mobile, and role are required.');
      }

      const memberId = 'mb_' + crypto.randomBytes(12).toString('hex');
      const result = await query(
        `INSERT INTO committee_members (id, name, mobile, email, role, status)
         VALUES ($1, $2, $3, $4, $5, 'Active')
         RETURNING *`,
        [memberId, name.trim(), mobile.trim(), email ? email.trim() : null, role]
      );

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Add Committee Member',
        entityType: 'Committee',
        entityId: memberId,
        metadata: { name, role },
        req
      });

      return sendSuccess(res, { member: result.rows[0] }, 'Committee member added successfully', 201);
    } catch (err) {
      console.error('[Committee POST Error]', err);
      return sendError(res, 'Failed to add committee member.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return sendError(res, 'Method not allowed', 405);
}
