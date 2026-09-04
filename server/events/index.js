/**
 * /api/events
 *
 * GET    public — published events, soonest first
 * POST   admin  — add an event
 * PUT    admin  — edit an event
 * DELETE admin  — remove an event
 *
 * Temple events and festivals. Built on the shared resource handler so that
 * editing, publishing, featuring, ordering, Telugu content and audit logging
 * all work the same way they do everywhere else — the previous version could
 * only create and delete, so an administrator who mistyped a date had to
 * delete the event and start again.
 *
 * Nothing is invented on the administrator's behalf. The previous version
 * filled in "Main Sanctum" whenever a location was left blank, which put a
 * place into the temple's calendar that nobody had chosen; a blank location
 * now stays blank.
 *
 * The response keeps its `events` key alongside `items`, because existing
 * pages read `data.events`.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { sanitizeString, validateDate } from '../_lib/validation.js';

const text = (max) => (v) => sanitizeString(v, max) || null;
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Only http(s) links or site-relative paths; never javascript: or data:. */
const safeUrl = (v) => {
  const raw = sanitizeString(v, 500);
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  return /^https?:\/\//i.test(raw) ? raw : NaN;
};

const PUBLIC_SELECT = `id, title, title_telugu, slug, description, description_telugu,
  event_date, start_time, end_time, location, image_url, media_id, featured,
  display_order, published, created_at`;

const handler = createResourceHandler({
  table: 'events',
  idPrefix: 'ev',
  entityType: 'Event',
  publicSelect: PUBLIC_SELECT,
  publicWhere: 'published = TRUE',
  // Soonest first: an events page is read to find out what is coming.
  orderBy: 'event_date ASC, display_order ASC',
  requiredOnCreate: ['title', 'eventDate'],
  fields: {
    title: { column: 'title', transform: text(200) },
    titleTelugu: { column: 'title_telugu', transform: text(200) },
    description: { column: 'description', transform: text(4000) },
    descriptionTelugu: { column: 'description_telugu', transform: text(4000) },
    eventDate: {
      column: 'event_date',
      transform: (v) => sanitizeString(v, 32) || null,
      validate: (value) =>
        value && !validateDate(value) ? 'Enter the event date as YYYY-MM-DD.' : null
    },
    startTime: { column: 'start_time', transform: text(16) },
    endTime: { column: 'end_time', transform: text(16) },
    // No default. An event with no stated location says nothing, rather than
    // claiming one nobody chose.
    location: { column: 'location', transform: text(200) },
    imageUrl: {
      column: 'image_url',
      transform: safeUrl,
      validate: (value, raw) =>
        value === null || typeof value === 'string'
          ? null
          : `"${raw}" must be an http(s) address or a path beginning with "/".`
    },
    mediaId: { column: 'media_id', transform: text(64) },
    slug: {
      column: 'slug',
      derivedFrom: 'slug',
      transform: (raw, body) => {
        const base = String(raw || body?.title || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 120);
        return base || null;
      },
      validate: (value) =>
        value ? null : 'An event name must contain at least one letter or number.'
    },
    featured: { column: 'featured', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

export default async function eventsHandler(req, res) {
  if (req.method !== 'GET') return handler(req, res);

  // Existing pages read `data.events`; newer ones read `data.items`. Both are
  // returned so neither has to change.
  const captured = {};
  const proxy = {
    ...res,
    setHeader: (...args) => res.setHeader(...args),
    status(code) {
      captured.status = code;
      return proxy;
    },
    json(payload) {
      captured.payload = payload;
      return proxy;
    }
  };

  await handler(req, proxy);

  const payload = captured.payload;
  if (!payload?.success || !payload?.data) {
    res.status(captured.status || 200).json(payload ?? { success: false });
    return;
  }

  res.status(captured.status || 200).json({
    ...payload,
    data: { ...payload.data, events: payload.data.items }
  });
}
