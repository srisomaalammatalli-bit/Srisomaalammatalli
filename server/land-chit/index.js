import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const landRes = await query(`SELECT * FROM land_income ORDER BY payment_date DESC, created_at DESC`);
      const chitRes = await query(`SELECT * FROM chit_income ORDER BY due_date DESC, created_at DESC`);
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

      const body = req.body || {};
      const recordType = (body.type || body.kind || '').toLowerCase();

      if (recordType === 'land') {
        const propertyName = body.propertyName || body.propName || body.property_name || 'Temple Agricultural Land';
        const tenantName = body.tenantName || body.tenant_name || '';
        const period = body.period || body.landPeriod || 'Annual';
        const rawAmount = body.amount || body.landAmt;
        const paymentDate = body.paymentDate || body.payment_date || new Date().toISOString().split('T')[0];
        const proofUrl = body.proofUrl || body.proof_url || null;
        const status = body.status || 'Verified';
        const fy = body.fy || body.financialYearId || body.financial_year_id || 'FY2026-27';

        if (!rawAmount || Number(rawAmount) <= 0) {
          return sendBadRequest(res, 'A positive lease amount is required.');
        }
        if (!tenantName.trim()) {
          return sendBadRequest(res, 'Tenant / Lessee name is required.');
        }

        const landId = 'land_' + crypto.randomBytes(12).toString('hex');
        const insertRes = await query(
          `INSERT INTO land_income (id, source_type, property_name, tenant_name, period, amount, payment_date, proof_url, status, financial_year_id, created_by)
           VALUES ($1, 'Land Lease', $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            landId,
            propertyName.trim(),
            tenantName.trim(),
            period.trim(),
            Number(rawAmount),
            paymentDate,
            proofUrl,
            status,
            fy,
            user.id
          ]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Record Land Income',
          entityType: 'Land Lease',
          entityId: landId,
          metadata: { amount: Number(rawAmount), propertyName, tenantName },
          req
        });

        return sendSuccess(res, { record: insertRes.rows[0] }, 'Land lease payment recorded successfully', 201);
      }

      if (recordType === 'chit') {
        const chitName = body.chitName || body.chit_name || 'Temple Committee Welfare Chit';
        const memberName = body.memberName || body.member_name || '';
        const installmentNo = Number(body.installmentNo || body.installment_no || 1);
        const rawAmount = body.amount || body.chitAmt;
        const dueDate = body.dueDate || body.due_date || new Date().toISOString().split('T')[0];
        const paidDate = body.paidDate || body.paid_date || new Date().toISOString().split('T')[0];
        const status = body.status || 'Paid';
        const fy = body.fy || body.financialYearId || body.financial_year_id || 'FY2026-27';

        if (!rawAmount || Number(rawAmount) <= 0) {
          return sendBadRequest(res, 'A positive installment amount is required.');
        }
        if (!memberName.trim()) {
          return sendBadRequest(res, 'Member / Contributor name is required.');
        }

        const chitId = 'chit_' + crypto.randomBytes(12).toString('hex');
        const insertRes = await query(
          `INSERT INTO chit_income (id, chit_name, member_name, installment_no, due_date, paid_date, amount, status, financial_year_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            chitId,
            chitName.trim(),
            memberName.trim(),
            installmentNo,
            dueDate,
            paidDate,
            Number(rawAmount),
            status,
            fy,
            user.id
          ]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Record Chit Income',
          entityType: 'Chit Fund',
          entityId: chitId,
          metadata: { amount: Number(rawAmount), chitName, memberName },
          req
        });

        return sendSuccess(res, { record: insertRes.rows[0] }, 'Chit installment recorded successfully', 201);
      }

      return sendBadRequest(res, 'Invalid record type: specify "land" or "chit".');
    } catch (err) {
      console.error('[Land & Chit POST Error]', err);
      return sendError(res, err.message || 'Failed to save record.');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to delete records.');
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Record ID is required.');
      }

      let deletedFrom = null;
      let recordTitle = id;

      if (id.startsWith('land_')) {
        const existing = await query('SELECT id, property_name, tenant_name, amount FROM land_income WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
          recordTitle = `${existing.rows[0].property_name} - ${existing.rows[0].tenant_name}`;
          await query('DELETE FROM land_income WHERE id = $1', [id]);
          deletedFrom = 'Land Lease';
        }
      } else if (id.startsWith('chit_')) {
        const existing = await query('SELECT id, chit_name, member_name, amount FROM chit_income WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
          recordTitle = `${existing.rows[0].chit_name} - ${existing.rows[0].member_name}`;
          await query('DELETE FROM chit_income WHERE id = $1', [id]);
          deletedFrom = 'Chit Fund';
        }
      } else {
        // Fallback: check both tables
        const landCheck = await query('SELECT id FROM land_income WHERE id = $1', [id]);
        if (landCheck.rows.length > 0) {
          await query('DELETE FROM land_income WHERE id = $1', [id]);
          deletedFrom = 'Land Lease';
        } else {
          const chitCheck = await query('SELECT id FROM chit_income WHERE id = $1', [id]);
          if (chitCheck.rows.length > 0) {
            await query('DELETE FROM chit_income WHERE id = $1', [id]);
            deletedFrom = 'Chit Fund';
          }
        }
      }

      if (!deletedFrom) {
        return sendBadRequest(res, 'Record not found or already deleted.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: `Delete ${deletedFrom} Record`,
        entityType: deletedFrom,
        entityId: id,
        metadata: { id, title: recordTitle },
        req
      });

      return sendSuccess(res, { deleted: true, id }, 'Record deleted successfully');
    } catch (err) {
      console.error('[Land & Chit DELETE Error]', err);
      return sendError(res, err.message || 'Failed to delete record.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return sendError(res, 'Method not allowed', 405);
}
