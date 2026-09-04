/**
 * /api/announcements
 *
 * GET    public — notices that are published and currently in their window
 * GET    admin  — every notice, including drafts and expired ones
 * POST   admin  — create a notice
 * PUT    admin  — edit or publish a notice
 * DELETE admin  — remove a notice
 *
 * Temple notices: festival announcements, closures, urgent messages. The
 * committee writes them here and they appear on the site immediately,
 * because the public page reads this endpoint rather than a built file.
 *
 * A notice is public only while all three are true: it is published, its
 * start time has passed (or is unset), and its end time has not (or is
 * unset). That is what makes a festival notice stop showing by itself
 * afterwards, rather than relying on somebody remembering to take it down.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError } from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { sanitizeString } from '../_lib/validation.js';

/**
 * The types the database accepts. A donation or pooja notice is recorded as
 * a GENERAL notice: the schema's vocabulary is fixed by a CHECK constraint,
 * and storing a value it would reject is worse than mapping to one it
 * accepts.
 */
const TYPES = ['ANNOUNCEMENT', 'URGENT', 'FESTIVAL', 'EVENT', 'CLOSURE', 'GENERAL'];

const text = (max) => (v) => sanitizeString(v, max) || null;
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** A timestamp, or nothing. Blank means "no limit", not "now". */
const timestamp = (v) => {
  const raw = sanitizeString(v, 32);
  return raw || null;
};

const PUBLIC_SELECT = `id, type, title, title_telugu, description, description_telugu,
  priority, start_at, end_at, published, show_on_ticker, show_on_homepage,
  dismissible, created_at`;

const handler = createResourceHandler({
  table: 'announcements',
  idPrefix: 'ann',
  entityType: 'Announcement',
  publicSelect: PUBLIC_SELECT,
  publicWhere: 'published = TRUE',
  orderBy: 'priority DESC, created_at DESC',
  requiredOnCreate: ['title'],
  fields: {
    type: {
      column: 'type',
      transform: (v) => {
        const raw = String(v || 'ANNOUNCEMENT')
          .toUpperCase()
          .replace(/[^A-Z_]/g, '');
        // Donation and pooja notices are general notices in the schema.
        if (raw === 'DONATION' || raw === 'POOJA') return 'GENERAL';
        return raw;
      },
      validate: (value) =>
        TYPES.includes(value)
          ? null
          : `Notice type must be one of: ${TYPES.join(', ')} (donation and pooja notices are recorded as GENERAL).`
    },
    title: { column: 'title', transform: text(200) },
    titleTelugu: { column: 'title_telugu', transform: text(200) },
    description: { column: 'description', transform: text(4000) },
    descriptionTelugu: { column: 'description_telugu', transform: text(4000) },
    priority: { column: 'priority', transform: int },
    startAt: { column: 'start_at', transform: timestamp },
    endAt: { column: 'end_at', transform: timestamp },
    published: { column: 'published', transform: bool },
    showOnTicker: { column: 'show_on_ticker', transform: bool },
    showOnHomepage: { column: 'show_on_homepage', transform: bool },
    dismissible: { column: 'dismissible', transform: bool }
  }
});

export default async function announcementsHandler(req, res) {
  // Writes, and any authenticated read, go to the shared handler unchanged.
  if (req.method !== 'GET') return handler(req, res);

  const user = await getAuthenticatedUser(req).catch(() => null);
  if (user) return handler(req, res);

  // Public reads additionally respect the scheduling window.
  try {
    const result = await query(
      `SELECT ${PUBLIC_SELECT} FROM announcements
        WHERE published = TRUE
          AND (start_at IS NULL OR start_at <= CURRENT_TIMESTAMP)
          AND (end_at IS NULL OR end_at >= CURRENT_TIMESTAMP)
        ORDER BY priority DESC, created_at DESC`
    );
    return sendSuccess(res, { items: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Announcements Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Failed to load announcements.');
  }
}
