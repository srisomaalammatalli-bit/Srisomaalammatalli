/**
 * /api/media
 *
 * GET    public — published, active assets (for the public pages)
 * GET    admin  — everything, including unpublished and archived
 * POST   admin  — register an asset (an R2 upload, or an external URL)
 * PUT    admin  — edit title, description, category, publish, feature, order
 * DELETE admin  — archive (default) or permanently remove the record (?purge=1)
 *
 * The media library. Every photograph and video the site shows is a row
 * here; gallery items, videos, homepage sections and inscriptions point at
 * these rows rather than carrying their own copy of a URL.
 *
 * Filters (all optional, combinable):
 *   ?type=IMAGE|VIDEO|DOCUMENT                    what the file is
 *   ?provider=LOCAL_ASSET|R2|YOUTUBE|EXTERNAL_URL where it lives
 *   ?category=Deity                               admin-assigned grouping
 *   ?q=alankaram                                  search title/filename/caption
 *   ?featured=1                                   featured only
 *
 * Deleting archives by default (active = false) rather than destroying the
 * row: a photograph removed from the site by mistake should be recoverable,
 * and a record other tables reference must not vanish underneath them. Even
 * a purge removes only the database row — the file on disk is never touched
 * by this endpoint.
 */

import crypto from 'crypto';
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

const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'DOCUMENT'];
const PROVIDERS = ['R2', 'EXTERNAL_URL', 'YOUTUBE', 'LOCAL_ASSET'];

const PUBLIC_COLUMNS = `id, media_type, storage_provider, public_url, object_key,
  original_filename, safe_filename, mime_type, file_size, width, height,
  duration_seconds, alt_text, caption, category, title, title_telugu, description,
  featured, display_order, published, created_at`;

const ADMIN_COLUMNS = `${PUBLIC_COLUMNS}, active, source_path, checksum,
  r2_object_key, r2_uploaded_at, uploaded_by, updated_at`;

/**
 * Where each asset is used, keyed by media id and also by URL.
 *
 * Content tables reference media two ways: newer rows carry a media_id,
 * older ones just hold the URL string. Both are matched, so an administrator
 * sees the real answer to "is anything using this?" before archiving it.
 *
 * A table that does not exist or cannot be read is skipped rather than
 * failing the whole listing — knowing about six of seven usages is far more
 * useful than an error.
 */
const USAGE_SOURCES = [
  { table: 'gallery', label: 'Gallery', urlColumn: 'image_url', titleColumn: 'title' },
  { table: 'videos', label: 'Videos', urlColumn: 'youtube_url', titleColumn: 'title' },
  { table: 'events', label: 'Events', urlColumn: 'image_url', titleColumn: 'title' },
  { table: 'poojas', label: 'Poojas', urlColumn: 'image_url', titleColumn: 'name' },
  { table: 'homepage_sections', label: 'Homepage', urlColumn: null, titleColumn: 'section_key' },
  { table: 'temple_festivals', label: 'Festival archive', urlColumn: 'featured_image', titleColumn: 'name' },
  { table: 'temple_inscriptions', label: 'Inscriptions', urlColumn: 'image_url', titleColumn: 'title' }
];

async function collectUsage() {
  const usage = new Map();
  const add = (key, entry) => {
    if (!key) return;
    if (!usage.has(key)) usage.set(key, []);
    usage.get(key).push(entry);
  };

  for (const source of USAGE_SOURCES) {
    const columns = ['media_id', source.titleColumn, source.urlColumn].filter(Boolean).join(', ');
    try {
      const rows = await query(`SELECT ${columns} FROM ${source.table}`);
      for (const row of rows.rows) {
        const entry = { area: source.label, title: row[source.titleColumn] || null };
        if (row.media_id) add(row.media_id, entry);
        if (source.urlColumn && row[source.urlColumn]) add(row[source.urlColumn], entry);
      }
    } catch (err) {
      console.error(`[Media usage: ${source.table}]`, err.message);
    }
  }

  // Settings point at media by URL — the donation QR most importantly, which
  // must never be archived by accident.
  try {
    const rows = await query(
      "SELECT key, value FROM settings WHERE value LIKE '/assets/%' OR value LIKE 'http%'"
    );
    for (const row of rows.rows) {
      add(row.value, { area: 'Settings', title: row.key });
    }
  } catch (err) {
    console.error('[Media usage: settings]', err.message);
  }

  return usage;
}

/** Only http(s) or site-relative paths; never javascript: or data:. */
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
      const { type, provider, category, q, featured } = req.query || {};
      const conditions = [];
      const params = [];

      // An anonymous caller sees only what has been published and not
      // archived. An administrator sees the whole library, which is the
      // point of the media manager.
      if (!user) conditions.push('published = TRUE AND active = TRUE');

      if (type && MEDIA_TYPES.includes(String(type).toUpperCase())) {
        params.push(String(type).toUpperCase());
        conditions.push(`media_type = $${params.length}`);
      }
      if (provider && PROVIDERS.includes(String(provider).toUpperCase())) {
        params.push(String(provider).toUpperCase());
        conditions.push(`storage_provider = $${params.length}`);
      }
      if (category) {
        params.push(sanitizeString(category, 64));
        conditions.push(`category = $${params.length}`);
      }
      if (featured === '1' || featured === 'true') {
        conditions.push('featured = TRUE');
      }
      if (q) {
        // Matched against what a person would actually search by.
        //
        // The term is bound once per column rather than reusing a single
        // placeholder: PostgreSQL is happy to repeat $4, but the SQLite
        // adapter rewrites every $n to a positional "?", so a repeated
        // placeholder would silently expect four values and match nothing.
        const term = `%${sanitizeString(q, 100).toLowerCase()}%`;
        const clauses = ['title', 'original_filename', 'caption', 'category'].map((column) => {
          params.push(term);
          return `LOWER(COALESCE(${column}, '')) LIKE $${params.length}`;
        });
        conditions.push(`(${clauses.join(' OR ')})`);
      }

      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT ${user ? ADMIN_COLUMNS : PUBLIC_COLUMNS} FROM media_assets${where}
          ORDER BY display_order ASC, created_at DESC`,
        params
      );

      // Administrators also learn where each file is used, so they can tell
      // an unused upload from one the homepage depends on before archiving it.
      if (user) {
        const usage = await collectUsage();
        const items = result.rows.map((row) => ({
          ...row,
          usage: usage.get(row.id) || usage.get(row.public_url) || []
        }));
        return sendSuccess(res, { items, count: items.length });
      }

      return sendSuccess(res, { items: result.rows, count: result.rows.length });
    }

    /* ---------------- Everything below is administrative ---------------- */
    if (!user) return sendUnauthorized(res, 'Authentication required.');
    if (!hasRequiredRole(user, WRITE_ROLES)) {
      return sendForbidden(res, 'Your role does not permit this action.');
    }

    /* ---------------- CREATE ---------------- */
    if (req.method === 'POST') {
      const body = req.body || {};
      const publicUrl = safeUrl(body.publicUrl);
      if (!publicUrl) {
        return sendBadRequest(
          res,
          'A media address is required, as an http(s) link or a path beginning with "/".'
        );
      }

      const mediaType = String(body.mediaType || 'IMAGE').toUpperCase();
      if (!MEDIA_TYPES.includes(mediaType)) {
        return sendBadRequest(res, `Media type must be one of: ${MEDIA_TYPES.join(', ')}.`);
      }

      const provider = String(body.storageProvider || 'EXTERNAL_URL').toUpperCase();
      if (!PROVIDERS.includes(provider)) {
        return sendBadRequest(res, `Storage provider must be one of: ${PROVIDERS.join(', ')}.`);
      }

      const id = `med_${crypto.randomBytes(12).toString('hex')}`;
      const result = await query(
        `INSERT INTO media_assets
           (id, media_type, storage_provider, public_url, object_key, original_filename,
            safe_filename, mime_type, file_size, width, height, alt_text, caption,
            category, title, title_telugu, description, published, active, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                 $18, TRUE, $19)
         RETURNING *`,
        [
          id,
          mediaType,
          provider,
          publicUrl,
          sanitizeString(body.objectKey, 500) || null,
          sanitizeString(body.originalFilename, 255) || null,
          sanitizeString(body.safeFilename, 255) || null,
          sanitizeString(body.mimeType, 128) || null,
          Number.isFinite(Number(body.fileSize)) ? Number(body.fileSize) : null,
          Number.isFinite(Number(body.width)) ? Number(body.width) : null,
          Number.isFinite(Number(body.height)) ? Number(body.height) : null,
          sanitizeString(body.altText, 300) || null,
          sanitizeString(body.caption, 500) || null,
          sanitizeString(body.category, 64) || null,
          sanitizeString(body.title, 200) || null,
          sanitizeString(body.titleTelugu, 200) || null,
          sanitizeString(body.description, 2000) || null,
          Boolean(body.published),
          user.id
        ]
      );

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Media Added',
        entityType: 'Media Asset',
        entityId: id,
        metadata: { provider, mediaType },
        req
      });

      return sendSuccess(res, { item: result.rows[0] ?? { id } }, 'Media added.', 201);
    }

    /* ---------------- UPDATE ---------------- */
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const id = extractId(req) || sanitizeString((req.body || {}).id, 64);
      if (!id) return sendBadRequest(res, 'A media id is required.');

      const body = req.body || {};
      const columns = [];
      const values = [];

      const push = (column, value) => {
        columns.push(column);
        values.push(value);
      };

      // Only what an administrator is meant to edit. The file facts —
      // checksum, size, dimensions, source path — are written by the
      // importer from the file itself and are not editable here.
      if (body.title !== undefined) push('title', sanitizeString(body.title, 200) || null);
      if (body.titleTelugu !== undefined) {
        push('title_telugu', sanitizeString(body.titleTelugu, 200) || null);
      }
      if (body.description !== undefined) {
        push('description', sanitizeString(body.description, 2000) || null);
      }
      if (body.altText !== undefined) push('alt_text', sanitizeString(body.altText, 300) || null);
      if (body.caption !== undefined) push('caption', sanitizeString(body.caption, 500) || null);
      if (body.category !== undefined) push('category', sanitizeString(body.category, 64) || null);
      if (body.published !== undefined) push('published', Boolean(body.published));
      if (body.featured !== undefined) push('featured', Boolean(body.featured));
      if (body.active !== undefined) push('active', Boolean(body.active));
      if (body.displayOrder !== undefined) {
        const n = Number.parseInt(body.displayOrder, 10);
        push('display_order', Number.isFinite(n) ? n : 0);
      }

      if (!columns.length) return sendBadRequest(res, 'No valid fields supplied.');

      push('updated_at', new Date().toISOString().slice(0, 19).replace('T', ' '));

      const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const result = await query(
        `UPDATE media_assets SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`,
        [...values, id]
      );
      if (!result.rows.length && result.rowCount === 0) {
        return sendNotFound(res, 'Media not found.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Media Updated',
        entityType: 'Media Asset',
        entityId: id,
        metadata: { fields: columns },
        req
      });

      return sendSuccess(res, { item: result.rows[0] ?? { id } }, 'Media updated.');
    }

    /* ---------------- ARCHIVE / DELETE ---------------- */
    if (req.method === 'DELETE') {
      const id = extractId(req) || sanitizeString((req.body || {}).id, 64);
      if (!id) return sendBadRequest(res, 'A media id is required.');

      const purge = req.query?.purge === '1' || (req.body || {}).purge === true;
      const forced = req.query?.force === '1' || (req.body || {}).force === true;

      // Removing a picture the homepage or the donation QR depends on would
      // leave a broken image on the public site with no warning. The request
      // is refused and the places using it are named, so an administrator
      // decides rather than discovering the damage later.
      if (!forced) {
        const asset = await query('SELECT id, public_url FROM media_assets WHERE id = $1', [id]);
        if (!asset.rows.length) return sendNotFound(res, 'Media not found.');

        const usage = await collectUsage();
        const references = usage.get(id) || usage.get(asset.rows[0].public_url) || [];
        if (references.length) {
          return sendError(
            res,
            `This image is currently used by: ${references
              .map((r) => (r.title ? `${r.area} — ${r.title}` : r.area))
              .join('; ')}. Remove those references first, or confirm to continue anyway.`,
            'MEDIA_IN_USE',
            409
          );
        }
      }

      // A local asset's row can be removed, but the file itself stays on
      // disk: this endpoint manages records, never the repository.
      if (purge) {
        const result = await query('DELETE FROM media_assets WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length && result.rowCount === 0) {
          return sendNotFound(res, 'Media not found.');
        }
        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: 'Media Deleted',
          entityType: 'Media Asset',
          entityId: id,
          metadata: { purged: true },
          req
        });
        return sendSuccess(res, { deleted: id }, 'Media record removed. The file itself is untouched.');
      }

      const result = await query(
        'UPDATE media_assets SET active = FALSE, published = FALSE WHERE id = $1 RETURNING id',
        [id]
      );
      if (!result.rows.length && result.rowCount === 0) {
        return sendNotFound(res, 'Media not found.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'Media Archived',
        entityType: 'Media Asset',
        entityId: id,
        metadata: {},
        req
      });

      return sendSuccess(res, { archived: id }, 'Media archived and removed from the public site.');
    }

    return sendMethodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (err) {
    console.error('[Media Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Failed to process the media request.');
  }
}
