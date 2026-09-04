/**
 * /api/temple/festivals
 * /api/temple/festivals?year=2021
 * /api/temple/festivals?slug=somalamma-jatara-2021
 *
 * GET    public — published festival records, newest year first
 * POST   admin  — add a festival record
 * PUT    admin  — update one
 * DELETE admin  — remove one
 *
 * The year-by-year archive. A record describes a festival that happened in
 * a particular year; start_date and end_date stay empty unless the actual
 * dates are documented, so an undated year shows as "dates not documented"
 * instead of implying a schedule that repeats.
 *
 * The year is a query parameter rather than a path segment because the route
 * resolver treats a trailing path segment as a record id, so
 * /api/temple/festivals/2021 would look up a record whose id is "2021".
 */

import { createResourceHandler } from '../../_lib/crud.js';
import { query } from '../../_lib/db.js';
import { sendSuccess, sendError } from '../../_lib/response.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';
import {
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  enumField,
  yearField,
  dateField,
  urlField,
  text,
  bool,
  int
} from '../../_lib/evidence.js';

const PUBLIC_SELECT = `id, name, name_telugu, slug, description, telugu_description,
  festival_type, calendar_reference, start_date, end_date, year, rituals,
  special_poojas, procession, cultural_programs, historical_notes,
  featured_image, source_url, source_title, source_type, verification_status,
  is_current, display_order, published, created_at`;

const slugify = (value, body) => {
  const base = String(value || body?.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
  return base || null;
};

const handler = createResourceHandler({
  table: 'temple_festivals',
  idPrefix: 'fest',
  entityType: 'Festival Record',
  publicSelect: PUBLIC_SELECT,
  publicWhere: 'published = TRUE',
  // Newest first: the archive is normally read from the present backwards.
  orderBy: 'year DESC, display_order ASC, created_at DESC',
  requiredOnCreate: ['name'],
  fields: {
    name: { column: 'name', transform: text(200) },
    nameTelugu: { column: 'name_telugu', transform: text(200) },
    slug: {
      column: 'slug',
      derivedFrom: 'slug',
      transform: slugify,
      validate: (value) =>
        value ? null : 'A festival name must contain at least one letter or number.'
    },
    description: { column: 'description', transform: text(20000) },
    teluguDescription: { column: 'telugu_description', transform: text(20000) },
    festivalType: { column: 'festival_type', transform: text(60) },
    // "Ugadi period" rather than a fixed date: the festival follows the
    // lunar calendar, so the reference is the honest field and the dates
    // are filled in per year.
    calendarReference: { column: 'calendar_reference', transform: text(160) },
    startDate: dateField('start_date'),
    endDate: dateField('end_date'),
    year: yearField('year'),
    rituals: { column: 'rituals', transform: text(10000) },
    specialPoojas: { column: 'special_poojas', transform: text(10000) },
    procession: { column: 'procession', transform: text(10000) },
    culturalPrograms: { column: 'cultural_programs', transform: text(10000) },
    historicalNotes: { column: 'historical_notes', transform: text(10000) },
    featuredImage: urlField('featured_image', 'Featured image'),
    mediaId: { column: 'media_id', transform: text(64) },
    sourceUrl: urlField('source_url', 'Source link'),
    sourceTitle: { column: 'source_title', transform: text(300) },
    sourceType: enumField('source_type', SOURCE_TYPES, 'Unverified'),
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    isCurrent: { column: 'is_current', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

export default async function festivalsHandler(req, res) {
  const { year, slug, current } = req.query || {};

  // Only GET is filtered here; every write goes to the shared handler so
  // authentication, validation and audit logging stay in one place.
  if (req.method !== 'GET' || (!year && !slug && !current)) {
    return handler(req, res);
  }

  try {
    const user = await getAuthenticatedUser(req).catch(() => null);
    const conditions = [];
    const params = [];

    if (!user) conditions.push('published = TRUE');
    if (year) {
      const parsed = Number.parseInt(year, 10);
      if (!Number.isInteger(parsed)) {
        return sendSuccess(res, { items: [], count: 0 });
      }
      params.push(parsed);
      conditions.push(`year = $${params.length}`);
    }
    if (slug) {
      params.push(String(slug));
      conditions.push(`slug = $${params.length}`);
    }
    if (current) conditions.push('is_current = TRUE');

    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT ${PUBLIC_SELECT} FROM temple_festivals${where}
       ORDER BY year DESC, display_order ASC, created_at DESC`,
      params
    );

    return sendSuccess(res, { items: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('[Festival Archive Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Failed to load the festival archive.');
  }
}
