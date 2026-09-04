/**
 * /api/timings
 *
 * GET    public — darshan timings for every day, plus special-day overrides
 * POST   admin  — add a special-day override
 * PUT    admin  — update a day's timings
 * DELETE admin  — remove a special-day override
 *
 * Seven weekday rows are created by the seeder; the committee edits those and
 * adds dated overrides for festivals, so timings never require a deployment.
 * There is no `published` column — every row is public information.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { sanitizeString } from '../_lib/validation.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Accept only HH:MM (24-hour); anything else becomes null rather than junk. */
function clockTime(v) {
  const raw = sanitizeString(v, 8);
  if (!raw) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : null;
}

/** Accept only YYYY-MM-DD. */
function isoDate(v) {
  const raw = sanitizeString(v, 10);
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export default createResourceHandler({
  table: 'temple_timings',
  idPrefix: 'tim',
  entityType: 'Temple Timing',
  publicSelect:
    'id, day_of_week, morning_open, morning_close, evening_open, evening_close, is_closed, is_special, special_date, special_note, display_order, updated_at',
  publicWhere: null, // timings are always public
  orderBy: 'display_order ASC',
  requiredOnCreate: ['dayOfWeek'],
  fields: {
    dayOfWeek: { column: 'day_of_week', transform: text(16) },
    morningOpen: { column: 'morning_open', transform: clockTime },
    morningClose: { column: 'morning_close', transform: clockTime },
    eveningOpen: { column: 'evening_open', transform: clockTime },
    eveningClose: { column: 'evening_close', transform: clockTime },
    isClosed: { column: 'is_closed', transform: bool },
    isSpecial: { column: 'is_special', transform: bool },
    specialDate: { column: 'special_date', transform: isoDate },
    specialNote: { column: 'special_note', transform: text(300) },
    displayOrder: { column: 'display_order', transform: int }
  }
});
