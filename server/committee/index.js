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
         ORDER BY display_order ASC, created_at ASC`
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
      if (!user) {
        return sendUnauthorized(res, 'Authentication required.');
      }

      const body = req.body || {};
      const name = (body.name || '').trim();
      const mobile = (body.mobile || '').trim();
      const email = (body.email || '').trim() || null;
      const role = body.role || 'Admin';
      const avatarBg = body.avatarBg || body.avatar_bg || '#6E1F2A';

      if (!name || !mobile) {
        return sendBadRequest(res, 'Name and mobile number are required.');
      }

      const memberId = 'mb_' + crypto.randomBytes(12).toString('hex');
      const result = await query(
        `INSERT INTO committee_members (id, name, mobile, email, role, status, avatar_bg)
         VALUES ($1, $2, $3, $4, $5, 'Active', $6)
         RETURNING *`,
        [memberId, name, mobile, email, role, avatarBg]
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
      return sendError(res, err.message || 'Failed to add committee member.');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to remove members.');
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Member ID is required.');
      }

      const existing = await query('SELECT id, name, role FROM committee_members WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return sendBadRequest(res, 'Member not found.');
      }

      // We can either soft-delete or hard-delete. Delete record so it doesn't clutter
      await query('DELETE FROM committee_members WHERE id = $1', [id]);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Remove Committee Member',
        entityType: 'Committee',
        entityId: id,
        metadata: { id, name: existing.rows[0].name, role: existing.rows[0].role },
        req
      });

      return sendSuccess(res, { deleted: true, id }, 'Committee member removed successfully');
    } catch (err) {
      console.error('[Committee DELETE Error]', err);
      return sendError(res, err.message || 'Failed to remove committee member.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return sendError(res, 'Method not allowed', 405);
}
