/**
 * /api/gallery-categories
 *
 * GET    public — published categories, in display order
 * POST   admin  — create a category
 * PUT    admin  — update a category
 * DELETE admin  — remove a category
 *
 * Categories are database rows rather than a constant in the gallery page, so
 * the committee can add "Kalyanam" or "Annadanam" later without a developer.
 *
 * A separate path from /api/gallery keeps the two from colliding: /api/gallery
 * treats a trailing segment as a record id.
 */

import { createResourceHandler } from '../_lib/crud.js';
import { sanitizeString } from '../_lib/validation.js';

const text = (max) => (v) => sanitizeString(v, max);
const bool = (v) => Boolean(v);
const int = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Categories are addressed by slug in URLs, so keep it URL-safe. */
const slugify = (v) =>
  sanitizeString(v, 64)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default createResourceHandler({
  table: 'gallery_categories',
  idPrefix: 'gcat',
  entityType: 'Gallery Category',
  publicSelect: 'id, slug, name, name_telugu, description, display_order, published, created_at',
  publicWhere: 'published = TRUE',
  orderBy: 'display_order ASC, name ASC',
  requiredOnCreate: ['name'],

  /**
   * A category name is unique. Adding one that already exists is an ordinary
   * mistake for a committee member to make — two people adding "Annadanam"
   * on the same day — and it surfaced as an opaque 500 from the unique index
   * on the slug. Check first and say so plainly.
   */
  beforeCreate: async (body, { query }) => {
    const slug = slugify(body?.name);
    if (!slug) return null;
    const clash = await query('SELECT name FROM gallery_categories WHERE slug = $1', [slug]);
    if (clash.rows.length) {
      return `A category called "${clash.rows[0].name}" already exists. Choose a different name.`;
    }
    return null;
  },

  /**
   * Photographs are filed under a category by name, not by a foreign key, so
   * nothing in the database stops a category from being removed out from under
   * them. Without this the pictures would quietly stop appearing under any
   * heading and the operator would have no idea why — so say how many are
   * affected, and say plainly that the photographs themselves are safe.
   */
  beforeDelete: async (id, { query, force }) => {
    if (force) return null;

    const found = await query('SELECT name FROM gallery_categories WHERE id = $1', [id]);
    const name = found.rows[0]?.name;
    if (!name) return null; // Not found: let the normal 404 handle it.

    const used = await query('SELECT COUNT(*) AS count FROM gallery WHERE category = $1', [name]);
    const count = Number(used.rows[0]?.count || 0);
    if (!count) return null;

    return (
      `${count} photograph${count === 1 ? '' : 's'} ${count === 1 ? 'uses' : 'use'} this category. ` +
      'The photographs will remain safely stored in the gallery, but they will no longer appear ' +
      'under this heading. Move them to another category first, or confirm to remove it anyway.'
    );
  },

  fields: {
    name: { column: 'name', transform: text(120) },
    nameTelugu: { column: 'name_telugu', transform: text(120) },
    // The column is NOT NULL but administrators only ever type a name, so the
    // slug is derived from it. An explicit slug still wins when one is sent.
    slug: {
      column: 'slug',
      derivedFrom: 'slug',
      transform: (raw, body) => slugify(raw || body?.name),
      validate: (value) =>
        value ? null : 'A category name must contain at least one letter or number.'
    },
    description: { column: 'description', transform: text(500) },
    displayOrder: { column: 'display_order', transform: int },
    published: { column: 'published', transform: bool }
  }
});
