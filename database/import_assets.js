/**
 * Import the files already sitting in public/assets/ into the CMS.
 *
 * The temple supplied real photographs and video before the CMS existed.
 * They are committed to the repository and served by the site, but the
 * database knows nothing about them, so the gallery and video pages — which
 * read from the database — show nothing. This registers each file as a
 * media_asset so the committee can then title, categorise and publish it
 * from the admin portal.
 *
 * What it does NOT do is invent anything. It records only what can be read
 * from the file itself: its path, size, checksum, MIME type and pixel
 * dimensions. Titles, captions, alt text, dates and any statement about what
 * a photograph depicts are left empty for an administrator who can actually
 * look at the image. A filename is a filename, not a caption — the file
 * called "bonalu-procession.jpg" is imported under that name without the
 * site thereby claiming it documents a Bonalu procession.
 *
 * Nothing is published. Every record arrives with published = false, so
 * importing cannot put an unreviewed image in front of devotees.
 *
 * Idempotent: a file is matched on its sha256, so re-running updates the
 * existing record rather than creating a second one. Re-run it freely after
 * adding files.
 *
 * Usage:  npm run import:assets
 *         npm run import:assets -- --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadEnv } from './env.js';

loadEnv();

const { query, closeConnections } = await import('../api/_lib/db.js');

const ASSET_ROOT = 'public/assets';
const DRY_RUN = process.argv.includes('--dry-run');

/* ------------------------------------------------------------------ *
 * Reading what the file actually is
 * ------------------------------------------------------------------ */

/** Recursively list every file under a directory. */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * Identify the file from its leading bytes rather than its extension, so a
 * mislabelled file is described by what it really is.
 */
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (buf[0] === 0xff && buf[1] === 0xd8) return { mime: 'image/jpeg', type: 'IMAGE' };
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', type: 'IMAGE' };
  if (hex.startsWith('47494638')) return { mime: 'image/gif', type: 'IMAGE' };
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    return { mime: 'image/webp', type: 'IMAGE' };
  }
  if (buf.subarray(4, 8).toString() === 'ftyp') return { mime: 'video/mp4', type: 'VIDEO' };
  if (hex.startsWith('1a45dfa3')) return { mime: 'video/webm', type: 'VIDEO' };
  if (hex.startsWith('25504446')) return { mime: 'application/pdf', type: 'DOCUMENT' };
  if (/^\s*(<\?xml|<svg)/.test(buf.subarray(0, 200).toString())) {
    return { mime: 'image/svg+xml', type: 'IMAGE' };
  }
  return { mime: null, type: null };
}

/** Pixel dimensions from a JPEG's SOF marker. */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len <= 0) return null;
    i += 2 + len;
  }
  return null;
}

/**
 * Dimensions, where they can be read confidently.
 *
 * Video dimensions are deliberately not parsed. Locating them means walking
 * the MP4 box tree, and a half-right guess (a width with a zero height, say)
 * is worse than no answer: an administrator can see the video, and a wrong
 * number in the database would be believed. NULL means "not measured".
 */
function dimensions(buf, mime) {
  if (mime === 'image/jpeg') return jpegSize(buf);
  if (mime === 'image/png') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

/**
 * A filename safe to use as an object key: lowercase, no spaces, no
 * directory traversal, no characters that need escaping in a URL.
 */
function safeFilename(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, path.extname(name));
  const clean = base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return `${clean || 'file'}${ext.replace(/[^a-z0-9.]/g, '')}`;
}

/**
 * A category from the directory the file sits in. This is an observation
 * about where the file is stored, not a claim about what it shows.
 */
function categoryFromPath(relPath) {
  const parts = relPath.split('/');
  const known = {
    deity: 'Deity',
    temple: 'Temple',
    festivals: 'Festivals',
    videos: 'Videos',
    qr: 'QR',
    events: 'Events'
  };
  for (const part of parts) {
    if (known[part]) return known[part];
  }
  return 'Uncategorised';
}

const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

async function importOne(file) {
  const buf = fs.readFileSync(file);
  const stat = fs.statSync(file);
  const rel = file.replace(/\\/g, '/');
  const { mime, type } = sniff(buf);

  if (!type) return { skipped: true, reason: 'unrecognised file type', file: rel };

  const checksum = crypto.createHash('sha256').update(buf).digest('hex');
  const dim = dimensions(buf, mime);
  const publicUrl = '/' + rel.replace(/^public\//, '');
  const filename = path.basename(rel);

  // Idempotency: the same bytes are the same asset, wherever they sit.
  const existing = await query('SELECT id, published FROM media_assets WHERE checksum = $1', [checksum]);

  if (existing.rows.length) {
    const row = existing.rows[0];
    if (DRY_RUN) return { updated: true, id: row.id, file: rel };
    // Refresh only the file facts. Anything an administrator wrote —
    // title, alt text, category, published — is left exactly as it is.
    await query(
      `UPDATE media_assets
          SET public_url = $1, source_path = $2, mime_type = $3, file_size = $4,
              width = COALESCE($5, width), height = COALESCE($6, height),
              original_filename = $7, safe_filename = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9`,
      [
        publicUrl,
        rel,
        mime,
        stat.size,
        dim?.width ?? null,
        dim?.height ?? null,
        filename,
        safeFilename(filename),
        row.id
      ]
    );
    return { updated: true, id: row.id, file: rel };
  }

  if (DRY_RUN) return { created: true, id: '(dry run)', file: rel };

  const id = newId('med');
  await query(
    `INSERT INTO media_assets
       (id, media_type, storage_provider, object_key, public_url, original_filename,
        safe_filename, mime_type, file_size, width, height, category,
        source_path, checksum, published, active)
     VALUES ($1, $2, 'LOCAL_ASSET', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, TRUE)`,
    [
      id,
      type,
      rel.replace(/^public\//, ''),
      publicUrl,
      filename,
      safeFilename(filename),
      mime,
      stat.size,
      dim?.width ?? null,
      dim?.height ?? null,
      categoryFromPath(rel),
      rel,
      checksum
    ]
  );
  return { created: true, id, file: rel };
}

/**
 * Link a gallery or video row that already points at a local path to the
 * media_asset for that same file, so the two are not describing the same
 * photograph twice. Existing rows are matched on their stored URL.
 */
async function linkExistingRecords() {
  let linked = 0;

  const assets = await query(
    "SELECT id, public_url FROM media_assets WHERE storage_provider = 'LOCAL_ASSET'"
  );
  const byUrl = new Map(assets.rows.map((a) => [a.public_url, a.id]));

  const galleryRows = await query(
    'SELECT id, image_url FROM gallery WHERE media_id IS NULL AND image_url IS NOT NULL'
  );
  for (const row of galleryRows.rows) {
    const assetId = byUrl.get(row.image_url);
    if (!assetId) continue;
    if (!DRY_RUN) await query('UPDATE gallery SET media_id = $1 WHERE id = $2', [assetId, row.id]);
    linked++;
  }

  const videoRows = await query(
    'SELECT id, youtube_url FROM videos WHERE media_id IS NULL AND youtube_url IS NOT NULL'
  );
  for (const row of videoRows.rows) {
    const assetId = byUrl.get(row.youtube_url);
    if (!assetId) continue;
    if (!DRY_RUN) await query('UPDATE videos SET media_id = $1 WHERE id = $2', [assetId, row.id]);
    linked++;
  }

  return linked;
}

async function main() {
  console.log(
    DRY_RUN
      ? 'Importing existing assets (dry run — nothing is written)\n'
      : 'Importing existing assets from public/assets/\n'
  );

  const files = walk(ASSET_ROOT);
  if (!files.length) {
    console.log('  No files found under public/assets/.');
    return;
  }

  let created = 0;
  let updated = 0;
  const skipped = [];

  for (const file of files.sort()) {
    const result = await importOne(file);
    if (result.skipped) {
      skipped.push(result);
      continue;
    }
    if (result.created) created++;
    else updated++;
    console.log(`  ${result.created ? 'new     ' : 'existing'}  ${result.file}`);
  }

  const linked = await linkExistingRecords();

  console.log(`\n  ${created} new, ${updated} already registered, ${linked} record(s) linked`);
  for (const s of skipped) console.log(`  skipped: ${s.file} (${s.reason})`);

  if (created) {
    console.log(
      '\nEvery imported file is unpublished and untitled. Open Admin → Media Library to\n' +
        'add a title, alt text and category, then publish the ones the temple wants shown.'
    );
  }
}

main()
  .then(() => closeConnections())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Import failed:', err.message);
    await closeConnections().catch(() => {});
    process.exit(1);
  });
