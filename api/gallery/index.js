/**
 * /api/gallery
 *
 * GET    public — published photographs only
 * POST   admin  — add a photograph
 * PUT    admin  — update a photograph
 * DELETE admin  — remove a photograph
 *
 * Image files themselves live under public/assets/images/ and are referenced
 * here by path; this endpoint stores metadata, not binaries.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { query } from '../_lib/db.js';
import { sendBadRequest } from '../_lib/response.js';
import { sanitizeString } from '../_lib/validation.js';
import {
  COPYRIGHT_STATUSES,
  VERIFICATION_STATUSES,
  enumField,
  yearField,
  dateField
} from '../_lib/evidence.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const handler = createResourceHandler({
  table: 'gallery',
  idPrefix: 'gal',
  entityType: 'Gallery Item',
  publicSelect:
    'id, title, title_telugu, description, image_url, category, alt_text, aspect_height, ' +
    'year, taken_on, source, source_url, copyright_status, verification_status, featured, ' +
    'display_order, published, created_at',
  publicWhere: 'published = TRUE',
  orderBy: 'display_order ASC, created_at DESC',
  requiredOnCreate: ['title', 'imageUrl', 'category'],
  fields: {
    title: { column: 'title', transform: text(200) },
    titleTelugu: { column: 'title_telugu', transform: text(200) },
    description: { column: 'description', transform: text(1000) },
    imageUrl: { column: 'image_url', transform: text(500) },
    category: { column: 'category', transform: text(64) },
    altText: { column: 'alt_text', transform: text(300) },
    aspectHeight: { column: 'aspect_height', transform: int },
    // Provenance. A historical photograph needs to say where it came from and
    // who holds the rights; a photograph taken by the temple last week needs
    // none of this, so every field is optional and blank means "not stated"
    // rather than an invented answer.
    year: yearField('year'),
    takenOn: dateField('taken_on'),
    source: { column: 'source', transform: text(300) },
    sourceUrl: { column: 'source_url', transform: text(1000) },
    copyrightStatus: enumField('copyright_status', COPYRIGHT_STATUSES, 'NOT_STATED'),
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    featured: { column: 'featured', transform: bool },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});

/**
 * Published photographs from the media library that have no gallery row of
 * their own.
 *
 * The media library is where a photograph is titled and published, so
 * publishing one there should be enough to put it in the gallery — an
 * administrator should not have to create a second record describing the
 * same picture. A gallery row still wins where one exists: it carries the
 * category, provenance and ordering the committee has set, and this only
 * fills in what it does not already cover.
 */
async function publishedMedia() {
  const result = await query(
    `SELECT m.id, m.title, m.title_telugu, m.description, m.public_url, m.category,
            m.alt_text, m.height, m.width, m.display_order, m.featured, m.created_at
       FROM media_assets m
       LEFT JOIN gallery g ON g.media_id = m.id
      WHERE m.published = TRUE
        AND m.active = TRUE
        AND m.media_type = 'IMAGE'
        AND g.id IS NULL
        AND NOT EXISTS (SELECT 1 FROM gallery g2 WHERE g2.image_url = m.public_url)
      ORDER BY m.display_order ASC, m.created_at DESC`
  );

  // Shaped like a gallery row so the page needs no second code path. The
  // aspect height drives the masonry rhythm; where the real pixel height is
  // known it is used, and otherwise the page's own default applies.
  return result.rows.map((m) => ({
    id: m.id,
    title: m.title || m.alt_text || '',
    title_telugu: m.title_telugu || null,
    description: m.description || null,
    image_url: m.public_url,
    category: m.category || null,
    alt_text: m.alt_text || null,
    aspect_height: m.width && m.height ? Math.round((m.height / m.width) * 400) : null,
    display_order: m.display_order ?? 0,
    featured: Boolean(m.featured),
    published: true,
    created_at: m.created_at,
    // Provenance is not invented for a media-library photograph: these stay
    // empty unless the committee records them on a gallery row.
    year: null,
    source: null,
    copyright_status: null,
    verification_status: null,
    from_media_library: true
  }));
}

/**
 * Categories an administrator may file a photograph under.
 *
 * gallery_categories is the authoritative list (migration 009 removed the
 * competing CHECK constraint). Validating here means a category the
 * committee has just created works immediately, and a mistyped one comes
 * back as a readable 400 rather than a database error.
 */
async function knownCategories() {
  const result = await query('SELECT name FROM gallery_categories');
  return result.rows.map((r) => r.name);
}

export default async function galleryHandler(req, res) {
  // Writes: check the category against the authoritative list first.
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const category = (req.body || {}).category;
    if (category !== undefined && String(category).trim() !== '') {
      try {
        const allowed = await knownCategories();
        if (!allowed.includes(String(category))) {
          return sendBadRequest(
            res,
            `"${category}" is not a gallery category. Available: ${allowed.join(', ')}. ` +
              'Add it under Gallery Categories first.'
          );
        }
      } catch (err) {
        // If the list cannot be read, fall through: the write either
        // succeeds or fails on its own merits rather than being blocked by
        // a lookup failure.
        console.error('[Gallery category check]', err.message);
      }
    }
    return handler(req, res);
  }

  if (req.method !== 'GET') return handler(req, res);

  // Let the shared handler answer first, then add anything published in the
  // media library that it did not already cover.
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

  try {
    const extra = await publishedMedia();
    const items = [...(payload.data.items || []), ...extra];
    res.status(captured.status || 200).json({
      ...payload,
      data: { ...payload.data, items, count: items.length }
    });
  } catch (err) {
    // The gallery rows are still good; a media-library failure must not
    // blank the page.
    console.error('[Gallery media merge]', err.message);
    res.status(captured.status || 200).json(payload);
  }
}
