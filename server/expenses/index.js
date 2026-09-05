import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { fy, category, status, search } = req.query;

      let sql = `SELECT id, title, category_id, amount, expense_date, paid_to, payment_method, description, receipt_url, status, financial_year_id, created_at
                 FROM expenses WHERE 1=1`;
      const params = [];
      let pIdx = 1;

      if (fy) {
        sql += ` AND financial_year_id = $${pIdx++}`;
        params.push(fy);
      }
      if (category && category !== 'All') {
        sql += ` AND category_id = $${pIdx++}`;
        params.push(category);
      }
      if (status && status !== 'All') {
        sql += ` AND status = $${pIdx++}`;
        params.push(status);
      }
      if (search) {
        sql += ` AND (title ILIKE $${pIdx} OR paid_to ILIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      sql += ` ORDER BY expense_date DESC, created_at DESC`;

      const result = await query(sql, params);
      return sendSuccess(res, { expenses: result.rows, count: result.rows.length });
    } catch (err) {
      console.error('[Expenses GET Error]', err);
      return sendError(res, 'Failed to fetch expenses.');
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to record expenditures.');
      }

      const { title, categoryId, amount, paidTo, paymentMethod, description, receiptUrl, status } = req.body || {};

      if (!title || !amount || Number(amount) <= 0 || !paidTo) {
        return sendBadRequest(res, 'Expense title, positive amount, and payee are required.');
      }

      const numAmount = Number(amount);
      const expenseId = 'exp_' + crypto.randomBytes(12).toString('hex');
      const finalStatus = receiptUrl ? 'Verified' : (status || 'Missing');

      const result = await query(
        `INSERT INTO expenses (id, title, category_id, amount, paid_to, payment_method, description, receipt_url, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          expenseId,
          title.trim(),
          categoryId || 'other',
          numAmount,
          paidTo.trim(),
          paymentMethod || 'UPI',
          description ? description.trim() : null,
          receiptUrl || null,
          finalStatus,
          user.id
        ]
      );

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Record Expense',
        entityType: 'Expense',
        entityId: expenseId,
        metadata: { title, amount: numAmount, paidTo, status: finalStatus },
        req
      });

      return sendSuccess(res, { expense: result.rows[0] }, 'Expense recorded successfully', 201);
    } catch (err) {
      console.error('[Expenses POST Error]', err);
      return sendError(res, 'Failed to record expense.');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to remove expense records.');
      }

      const id = req.query?.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Expense ID is required.');
      }

      const existing = await query('SELECT id, title, amount FROM expenses WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return sendBadRequest(res, 'Expense record not found.');
      }

      const record = existing.rows[0];

      await query('DELETE FROM expenses WHERE id = $1', [id]);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Delete Expense',
        entityType: 'Expense',
        entityId: id,
        metadata: { id, title: record.title, amount: record.amount },
        req
      });

      return sendSuccess(res, { deleted: true, id }, 'Expense record removed successfully');
    } catch (err) {
      console.error('[Expenses DELETE Error]', err);
      return sendError(res, 'Failed to delete expense record.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return sendError(res, 'Method not allowed', 405);
}
