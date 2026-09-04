import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest, sendUnauthorized } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const tickerOnly = req.query.ticker === 'true';
      let sql = `SELECT id, title, description, event_date, month_label, day_number, priority, show_on_ticker, published
                 FROM important_dates WHERE published = TRUE`;
      if (tickerOnly) {
        sql += ` AND show_on_ticker = TRUE`;
      }
      sql += ` ORDER BY event_date ASC`;

      const result = await query(sql);
      return sendSuccess(res, { dates: result.rows });
    } catch (err) {
      console.error('[Important Dates GET Error]', err);
      return sendError(res, 'Failed to fetch dates.');
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to create dates.');
      }

      const { title, description, eventDate, monthLabel, dayNumber, priority, showOnTicker } = req.body || {};

      if (!title || !eventDate || !monthLabel || !dayNumber) {
        return sendBadRequest(res, 'Title, date, month label, and day number are required.');
      }

      const dateId = 'dt_' + crypto.randomBytes(12).toString('hex');

      const result = await query(
        `INSERT INTO important_dates (id, title, description, event_date, month_label, day_number, priority, show_on_ticker, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         RETURNING *`,
        [
          dateId,
          title.trim(),
          description ? description.trim() : null,
          eventDate,
          monthLabel.toUpperCase().trim(),
          dayNumber.trim(),
          priority || 'Medium',
          showOnTicker !== undefined ? Boolean(showOnTicker) : true
        ]
      );

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Add Date',
        entityType: 'Important Date',
        entityId: dateId,
        metadata: { title },
        req
      });

      return sendSuccess(res, { date: result.rows[0] }, 'Date added successfully', 201);
    } catch (err) {
      console.error('[Important Dates POST Error]', err);
      return sendError(res, 'Failed to add date.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return sendError(res, 'Method not allowed', 405);
}
