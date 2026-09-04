import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const landRes = await query(`SELECT * FROM land_income ORDER BY payment_date DESC`);
      const chitRes = await query(`SELECT * FROM chit_income ORDER BY due_date DESC`);
      return sendSuccess(res, { landIncome: landRes.rows, chitIncome: chitRes.rows });
    } catch (err) {
      console.error('[Land & Chit GET Error]', err);
      return sendError(res, 'Failed to fetch land and chit records.');
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required.');
      }

      const { type, propertyName, tenantName, period, amount, chitName, memberName, installmentNo } = req.body || {};

      if (type === 'land') {
        if (!propertyName || !amount || Number(amount) <= 0) {
          return sendBadRequest(res, 'Property name and amount are required.');
        }
        const landId = 'land_' + crypto.randomBytes(12).toString('hex');
        const insertRes = await query(
          `INSERT INTO land_income (id, source_type, property_name, tenant_name, period, amount, status, created_by)
           VALUES ($1, 'Land Lease', $2, $3, $4, $5, 'Verified', $6)
           RETURNING *`,
          [landId, propertyName.trim(), tenantName ? tenantName.trim() : null, period || 'Annual', Number(amount), user.id]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Record Land Income',
          entityType: 'Land Lease',
          entityId: landId,
          metadata: { amount: Number(amount), propertyName },
          req
        });

        return sendSuccess(res, { record: insertRes.rows[0] }, 'Land lease payment recorded', 201);
      }

      if (type === 'chit') {
        if (!chitName || !amount || Number(amount) <= 0) {
          return sendBadRequest(res, 'Chit name and amount are required.');
        }
        const chitId = 'chit_' + crypto.randomBytes(12).toString('hex');
        const insertRes = await query(
          `INSERT INTO chit_income (id, chit_name, member_name, installment_no, due_date, paid_date, amount, status, created_by)
           VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE, $5, 'Paid', $6)
           RETURNING *`,
          [chitId, chitName.trim(), memberName ? memberName.trim() : null, Number(installmentNo || 1), Number(amount), user.id]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Record Chit Income',
          entityType: 'Chit Fund',
          entityId: chitId,
          metadata: { amount: Number(amount), chitName },
          req
        });

        return sendSuccess(res, { record: insertRes.rows[0] }, 'Chit installment recorded', 201);
      }

      return sendBadRequest(res, 'Invalid record type.');
    } catch (err) {
      console.error('[Land & Chit POST Error]', err);
      return sendError(res, 'Failed to save record.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return sendError(res, 'Method not allowed', 405);
}
