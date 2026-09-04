/**
 * /api/homepage-sections
 *
 * GET    public — enabled sections, in order, with their media resolved
 * GET    admin  — every section, including the disabled ones
 * PUT    admin  — edit a section's text, image, order or enabled state
 *
 * The homepage is assembled from these rows: which blocks appear, in what
 * order, with what heading and picture. An administrator turning off
 * TODAYS_SPECIAL or moving GALLERY above VIDEOS changes the live page with
 * no deployment.
 *
 * There is deliberately no POST or DELETE. A section key only means
 * something if the frontend knows how to render it, so inventing
 * "MY_NEW_SECTION" here would create a row that can never appear. The
 * sections are seeded by migration; the committee controls their content,
 * order and visibility.
 */

import { query } from '../_lib/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendMethodNotAllowed
} from '../_lib/response.js';
import { getAuthenticatedUser, hasRequiredRole } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';
import { sanitizeString } from '../_lib/validation.js';
import { extractId } from '../_lib/crud.js';

const WRITE_ROLES = ['admin', 'finance_manager'];

/**
 * The section's own columns plus the media it points at, so the homepage can
 * render a hero image from one request rather than fetching each section's
 * picture separately.
 */
const SELECT = `s.id, s.section_key, s.title, s.title_telugu, s.subtitle, s.subtitle_telugu,
  s.description, s.description_telugu, s.media_id, s.button_text, s.button_url,
  s.secondary_button_text, s.secondary_button_url, s.enabled, s.display_order,
  m.public_url AS media_url, m.alt_text AS media_alt, m.media_type AS media_type,
  m.width AS media_width, m.height AS media_height`;

const FROM = 'FROM homepage_sections s LEFT JOIN media_assets m ON m.id = s.media_id';

/** Only http(s) links or site-relative paths; never javascript: or data:. */
function safeUrl(value) {
  const raw = sanitizeString(value, 1000);
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  return /^https?:\/\//i.test(raw) ? raw : null;
}

export default async function handler(req, res) {
  try {
    const user = await getAuthenticatedUser(req).catch(() => null);

    /* ---------------- READ ---------------- */
    if (req.method === 'GET') {
      // A disabled section is invisible to devotees but still editable by the
      // committee, which is how a block is prepared before it goes live.
      const where = user ? '' : ' WHERE s.enabled = TRUE';
      const result = await query(
        `SELECT ${SELECT} ${FROM}${where} ORDER BY s.display_order ASC, s.section_key ASC`
      );
      return sendSuccess(res, { items: result.rows, count: result.rows.length });
    }

    /* ---------------- Administrative from here ---------------- */
    if (!user) return sendUnauthorized(res, 'Authentication required.');
    if (!hasRequiredRole(user, WRITE_ROLES)) {
      return sendForbidden(res, 'Your role does not permit this action.');
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {};
      const id = extractId(req) || sanitizeString(body.id, 64);
      const sectionKey = sanitizeString(body.sectionKey, 64);
      if (!id && !sectionKey) {
        return sendBadRequest(res, 'A section id or section key is required.');
      }

      const columns = [];
      const values = [];
      const push = (column, value) => {
        columns.push(column);
        values.push(value);
      };

      if (body.title !== undefined) push('title', sanitizeString(body.title, 200) || null);
      if (body.titleTelugu !== undefined) {
        push('title_telugu', sanitizeString(body.titleTelugu, 200) || null);
      }
      if (body.subtitle !== undefined) push('subtitle', sanitizeString(body.subtitle, 400) || null);
      if (body.subtitleTelugu !== undefined) {
        push('subtitle_telugu', sanitizeString(body.subtitleTelugu, 400) || null);
      }
      if (body.description !== undefined) {
        push('description', sanitizeString(body.description, 4000) || null);
      }
      if (body.descriptionTelugu !== undefined) {
        push('description_telugu', sanitizeString(body.descriptionTelugu, 4000) || null);
      }
      if (body.mediaId !== undefined) push('media_id', sanitizeString(body.mediaId, 64) || null);
      if (body.buttonText !== undefined) {
        push('button_text', sanitizeString(body.buttonText, 80) || null);
      }
      if (body.buttonUrl !== undefined) push('button_url', safeUrl(body.buttonUrl));
      if (body.secondaryButtonText !== undefined) {
        push('secondary_button_text', sanitizeString(body.secondaryButtonText, 80) || null);
      }
      if (body.secondaryButtonUrl !== undefined) {
        push('secondary_button_url', safeUrl(body.secondaryButtonUrl));
      }
      if (body.enabled !== undefined) push('enabled', Boolean(body.enabled));
      if (body.displayOrder !== undefined) {
        const n = Number.parseInt(body.displayOrder, 10);
        push('display_order', Number.isFinite(n) ? n : 0);
      }

      if (!columns.length) return sendBadRequest(res, 'No valid fields supplied.');

      push('updated_by', user.id);
      push('updated_at', new Date().toISOString().slice(0, 19).replace('T', ' '));

      const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const target = id ? 'id' : 'section_key';
      const result = await query(
        `UPDATE homepage_sections SET ${setClause} WHERE ${target} = $${columns.length + 1} RETURNING id`,
        [...values, id || sectionKey]
      );

      if (!result.rows.length && result.rowCount === 0) {
        return sendNotFound(res, 'That homepage section does not exist.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Homepage Section Updated',
        entityType: 'Homepage Section',
        entityId: id || sectionKey,
        metadata: { fields: columns },
        req
      });

      // Return the section as it now stands, media resolved, so the screen
      // shows the saved state rather than what it hoped it saved.
      const fresh = await query(`SELECT ${SELECT} ${FROM} WHERE s.${target} = $1`, [
        id || sectionKey
      ]);
      return sendSuccess(res, { item: fresh.rows[0] || null }, 'Homepage section updated.');
    }

    return sendMethodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    console.error('[Homepage Sections Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Failed to process the homepage section request.');
  }
}
