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

      const body = req.body || {};
      const title = (body.title || '').trim();
      const description = (body.description || body.desc || '').trim();
      const eventDate = body.eventDate || body.event_date || body.date;
      const priority = body.priority || 'Medium';
      const showOnTicker = body.showOnTicker !== undefined ? Boolean(body.showOnTicker) : (body.show_on_ticker !== undefined ? Boolean(body.show_on_ticker) : true);

      if (!title || !eventDate) {
        return sendBadRequest(res, 'Title and date are required.');
      }

      // Auto derive month label and day number if not provided
      let monthLabel = body.monthLabel || body.month_label || body.month;
      let dayNumber = body.dayNumber || body.day_number || body.day;

      if (!monthLabel || !dayNumber) {
        try {
          const parsed = new Date(eventDate + 'T00:00:00');
          if (!isNaN(parsed.getTime())) {
            if (!monthLabel) monthLabel = parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            if (!dayNumber) dayNumber = String(parsed.getDate());
          }
        } catch {}
      }

      monthLabel = (monthLabel || 'JAN').toUpperCase().trim();
      dayNumber = String(dayNumber || '1').trim();

      const dateId = 'dt_' + crypto.randomBytes(12).toString('hex');

      const result = await query(
        `INSERT INTO important_dates (id, title, description, event_date, month_label, day_number, priority, show_on_ticker, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         RETURNING *`,
        [
          dateId,
          title,
          description || null,
          eventDate,
          monthLabel,
          dayNumber,
          priority,
          showOnTicker
        ]
      );

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Add Date',
        entityType: 'Important Date',
        entityId: dateId,
        metadata: { title, eventDate },
        req
      });

      return sendSuccess(res, { date: result.rows[0] }, 'Date added successfully', 201);
    } catch (err) {
      console.error('[Important Dates POST Error]', err);
      return sendError(res, err.message || 'Failed to add date.');
    }
  }

  if (req.method === 'PUT') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to update dates.');
      }

      const id = req.query.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Date ID is required.');
      }

      const body = req.body || {};
      const updates = [];
      const params = [];
      let pIdx = 1;

      if (body.showOnTicker !== undefined || body.show_on_ticker !== undefined) {
        updates.push(`show_on_ticker = $${pIdx++}`);
        params.push(Boolean(body.showOnTicker !== undefined ? body.showOnTicker : body.show_on_ticker));
      }
      if (body.published !== undefined) {
        updates.push(`published = $${pIdx++}`);
        params.push(Boolean(body.published));
      }
      if (body.priority) {
        updates.push(`priority = $${pIdx++}`);
        params.push(body.priority);
      }
      if (body.title) {
        updates.push(`title = $${pIdx++}`);
        params.push(body.title.trim());
      }
      if (body.description !== undefined || body.desc !== undefined) {
        updates.push(`description = $${pIdx++}`);
        params.push((body.description || body.desc || '').trim() || null);
      }
      if (body.eventDate || body.event_date || body.date) {
        const evDate = body.eventDate || body.event_date || body.date;
        updates.push(`event_date = $${pIdx++}`);
        params.push(evDate);
      }

      if (updates.length === 0) {
        return sendBadRequest(res, 'No fields provided for update.');
      }

      params.push(id);
      const sql = `UPDATE important_dates SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;
      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return sendBadRequest(res, 'Date record not found.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Update Important Date',
        entityType: 'Important Date',
        entityId: id,
        metadata: { updates: body },
        req
      });

      return sendSuccess(res, { date: result.rows[0] }, 'Date updated successfully');
    } catch (err) {
      console.error('[Important Dates PUT Error]', err);
      return sendError(res, err.message || 'Failed to update date.');
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendUnauthorized(res, 'Authentication required to delete dates.');
      }

      const id = req.query.id || req.body?.id;
      if (!id) {
        return sendBadRequest(res, 'Date ID is required.');
      }

      const existing = await query('SELECT id, title FROM important_dates WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return sendBadRequest(res, 'Date record not found.');
      }

      await query('DELETE FROM important_dates WHERE id = $1', [id]);

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Delete Important Date',
        entityType: 'Important Date',
        entityId: id,
        metadata: { id, title: existing.rows[0].title },
        req
      });

      return sendSuccess(res, { deleted: true, id }, 'Date removed successfully');
    } catch (err) {
      console.error('[Important Dates DELETE Error]', err);
      return sendError(res, err.message || 'Failed to delete date.');
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return sendError(res, 'Method not allowed', 405);
}
