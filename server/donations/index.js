import crypto from 'crypto';
import { query, transaction } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { fy, category, method, search, limit = 50, offset = 0 } = req.query;

      let sql = `SELECT id, receipt_no, donor_name, mobile, email, address, category, amount, payment_method, payment_date, txn_ref, status, financial_year_id, created_at
                 FROM donations WHERE 1=1`;
      const params = [];
      let pIdx = 1;

      if (fy) {
        sql += ` AND financial_year_id = $${pIdx++}`;
        params.push(fy);
      }
      if (category && category !== 'All') {
        sql += ` AND category = $${pIdx++}`;
        params.push(category);
      }
      if (method && method !== 'All') {
        sql += ` AND payment_method = $${pIdx++}`;
        params.push(method);
      }
      if (search) {
        sql += ` AND (donor_name ILIKE $${pIdx} OR receipt_no ILIKE $${pIdx} OR mobile ILIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      sql += ` ORDER BY payment_date DESC, created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(Number(limit), Number(offset));

      const result = await query(sql, params);
      return sendSuccess(res, { donations: result.rows, count: result.rows.length });
    } catch (err) {
      console.error('[Donations GET Error]', err);
      return sendError(res, 'Failed to fetch donations.');
    }
  }

  if (req.method === 'POST') {
    try {
      const { donorName, mobile, email, address, category, amount, paymentMethod, txnRef, notes } = req.body || {};

      if (!donorName || !mobile || !category || !amount || Number(amount) <= 0) {
        return sendBadRequest(res, 'Donor name, valid mobile, category, and positive amount are required.');
      }

      const numAmount = Number(amount);
      const cleanMobile = String(mobile).replace(/\s+/g, '');
      const user = await getAuthenticatedUser(req);

      const validCategories = [
        'General Donation',
        'Annual Jathara Contribution',
        'Temple Development',
        'Special Pooja / Seva',
        'Other Contribution'
      ];
      let cleanCategory = String(category || '').trim();
      if (!validCategories.includes(cleanCategory)) {
        const lower = cleanCategory.toLowerCase();
        if (lower.includes('jathara')) {
          cleanCategory = 'Annual Jathara Contribution';
        } else if (lower.includes('development')) {
          cleanCategory = 'Temple Development';
        } else if (lower.includes('pooja') || lower.includes('seva')) {
          cleanCategory = 'Special Pooja / Seva';
        } else if (lower.includes('other')) {
          cleanCategory = 'Other Contribution';
        } else {
          cleanCategory = 'General Donation';
        }
      }

      const donationId = 'don_' + crypto.randomBytes(12).toString('hex');
      const year = new Date().getFullYear();
      const receiptNo = `BAT-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

      const createdRecord = await transaction(async (client) => {
        // 1. Insert into donations table
        const insertRes = await client.query(
          `INSERT INTO donations (id, receipt_no, donor_name, mobile, email, address, category, amount, payment_method, txn_ref, notes, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Verified', $12)
           RETURNING *`,
          [
            donationId,
            receiptNo,
            donorName.trim(),
            cleanMobile,
            email ? email.trim() : null,
            address ? address.trim() : null,
            cleanCategory,
            numAmount,
            paymentMethod || 'UPI',
            txnRef || null,
            notes || null,
            user ? user.id : null
          ]
        );

        // 2. Insert into donation_receipts
        const receiptId = 'rcpt_' + crypto.randomBytes(12).toString('hex');
        await client.query(
          `INSERT INTO donation_receipts (id, donation_id, receipt_no)
           VALUES ($1, $2, $3)`,
          [receiptId, donationId, receiptNo]
        );

        // 3. Log to audit trail
        await logAudit(client, {
          userId: user ? user.id : null,
          userName: user ? user.name : 'Devotee Online Self-Seva',
          action: 'Record Donation',
          entityType: 'Donation',
          entityId: receiptNo,
          metadata: { amount: numAmount, category: cleanCategory },
          req
        });

        return insertRes.rows[0];
      });

      return sendSuccess(res, { donation: createdRecord, receiptNo }, 'Donation successfully recorded & receipt issued', 201);
    } catch (err) {
      console.error('[Donations POST Error]', err);
      return sendError(res, 'Failed to record donation.');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to remove donation records.');
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Donation ID is required.');
      }

      const existing = await query('SELECT id, receipt_no, amount FROM donations WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return sendBadRequest(res, 'Donation record not found.');
      }

      const record = existing.rows[0];

      await transaction(async (client) => {
        await client.query('DELETE FROM donation_receipts WHERE donation_id = $1', [id]);
        await client.query('DELETE FROM donations WHERE id = $1', [id]);

        await logAudit(client, {
          userId: user.id,
          userName: user.name,
          action: 'Delete Donation',
          entityType: 'Donation',
          entityId: record.receipt_no || id,
          metadata: { id, amount: record.amount },
          req
        });
      });

      return sendSuccess(res, { deleted: true, id }, 'Donation record removed successfully');
    } catch (err) {
      console.error('[Donations DELETE Error]', err);
      return sendError(res, 'Failed to delete donation record.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return sendError(res, 'Method not allowed', 405);
}
