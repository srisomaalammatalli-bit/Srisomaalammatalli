/**
 * /api/media/upload
 *
 * GET   admin — whether R2 is configured, and what may be uploaded
 * POST  admin — upload a file to Cloudflare R2 and register it
 *
 * The upload path is deliberately server-side:
 *
 *   admin browser → this authenticated API → R2 → media_assets → public URL
 *
 * The browser never receives a signed URL and never sees an R2 credential.
 * The signature is computed here, used here, and discarded; only the finished
 * public URL goes back to the administrator. That costs one extra hop through
 * the server compared with a browser-direct upload, and buys the guarantee
 * that a credential cannot leak through the network tab.
 *
 * The file arrives as base64 in JSON rather than multipart, because the
 * handlers in this project take parsed JSON bodies and adding a multipart
 * parser would mean a new dependency for one screen. That caps a practical
 * upload at a few megabytes, which suits photographs; the limit below is
 * enforced before anything is sent onward.
 *
 * If R2 is not configured this says so plainly instead of failing halfway.
 * The temple's existing local assets keep working either way.
 */

import crypto from 'crypto';
import { query } from '../../_lib/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendMethodNotAllowed
} from '../../_lib/response.js';
import { getAuthenticatedUser, hasRequiredRole } from '../../_lib/auth.js';
import { logAudit } from '../../_lib/audit.js';
import { sanitizeString } from '../../_lib/validation.js';
import {
  isConfigured,
  buildObjectKey,
  createUploadUrl,
  publicUrlFor,
  deleteObject
} from '../../_lib/media/r2Provider.js';

const WRITE_ROLES = ['admin', 'finance_manager'];

/** What the temple may reasonably publish, matched to what the site renders. */
const ALLOWED = {
  'image/jpeg': { ext: '.jpg', type: 'IMAGE' },
  'image/png': { ext: '.png', type: 'IMAGE' },
  'image/webp': { ext: '.webp', type: 'IMAGE' },
  'image/svg+xml': { ext: '.svg', type: 'IMAGE' },
  'video/mp4': { ext: '.mp4', type: 'VIDEO' },
  'application/pdf': { ext: '.pdf', type: 'DOCUMENT' }
};

/** 12 MB. Large enough for a temple photograph, small enough for JSON. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Identify the file from its own bytes.
 *
 * The declared content type is a claim by the caller; this is what the file
 * actually is. A mismatch is refused, so a script cannot be uploaded as an
 * image and later served from the temple's own domain.
 */
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }
  if (buf.subarray(4, 8).toString() === 'ftyp') return 'video/mp4';
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (/^\s*(<\?xml|<svg)/.test(buf.subarray(0, 200).toString())) return 'image/svg+xml';
  return null;
}

/** Pixel dimensions where they can be read confidently; null otherwise. */
function dimensions(buf, mime) {
  if (mime === 'image/png') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (mime !== 'image/jpeg') return null;
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

export default async function handler(req, res) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return sendUnauthorized(res, 'Authentication required.');
    if (!hasRequiredRole(user, WRITE_ROLES)) {
      return sendForbidden(res, 'Your role does not permit uploads.');
    }

    /* ---------------- Is uploading available? ---------------- */
    if (req.method === 'GET') {
      return sendSuccess(res, {
        configured: isConfigured(),
        maxBytes: MAX_BYTES,
        acceptedTypes: Object.keys(ALLOWED),
        // Never the credentials themselves — only whether they are present.
        message: isConfigured()
          ? 'Cloudflare R2 is configured. Uploads are stored in R2.'
          : 'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
            'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_BASE_URL on the server ' +
            'to enable uploads. Existing local assets continue to work.'
      });
    }

    if (req.method !== 'POST') return sendMethodNotAllowed(res, ['GET', 'POST']);

    // Validation runs before the storage check, deliberately.
    //
    // The other order looks tidier but is wrong: an oversized file, or a
    // script wearing a .png name, came back as "R2 is not configured" — not
    // what went wrong, and it sends an administrator to the server settings
    // instead of to their file. It also left the input rules unreachable,
    // and so untestable, until credentials existed.
    const body = req.body || {};
    const filename = sanitizeString(body.filename, 255);
    if (!filename) return sendBadRequest(res, 'A filename is required.');
    if (!body.data) return sendBadRequest(res, 'No file content was received.');

    // Accept a bare base64 string or a data: URL.
    const base64 = String(body.data).replace(/^data:[^;]+;base64,/, '');
    let buf;
    try {
      buf = Buffer.from(base64, 'base64');
    } catch {
      return sendBadRequest(res, 'The file content could not be read.');
    }
    if (!buf.length) return sendBadRequest(res, 'The file is empty.');
    if (buf.length > MAX_BYTES) {
      return sendBadRequest(
        res,
        `That file is ${(buf.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_BYTES / 1024 / 1024} MB.`
      );
    }

    // The bytes decide, not the caller's claim about them.
    const actualMime = sniff(buf);
    if (!actualMime || !ALLOWED[actualMime]) {
      return sendBadRequest(
        res,
        `That file type cannot be published. Accepted: ${Object.keys(ALLOWED).join(', ')}.`
      );
    }

    // The file itself is sound. Whether it can be stored is a separate
    // question, and this is where it belongs.
    if (!isConfigured()) {
      return sendError(
        res,
        'Cloudflare R2 is not configured on the server, so files cannot be uploaded yet. ' +
          'Existing media in the library is unaffected.',
        'R2_NOT_CONFIGURED',
        503
      );
    }

    const checksum = crypto.createHash('sha256').update(buf).digest('hex');

    // The same file uploaded twice is the same asset.
    const existing = await query('SELECT id, public_url FROM media_assets WHERE checksum = $1', [
      checksum
    ]);
    if (existing.rows.length) {
      return sendSuccess(
        res,
        { item: existing.rows[0], alreadyPresent: true },
        'That file is already in the media library.'
      );
    }

    const category = sanitizeString(body.category, 64) || 'uploads';
    const objectKey = buildObjectKey(category, filename);

    // Sign and perform the upload here. The signed URL never leaves this
    // process.
    const signedUrl = await createUploadUrl({ objectKey, expiresIn: 300 });
    const uploaded = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': actualMime, 'Content-Length': String(buf.length) },
      body: buf
    });

    if (!uploaded.ok) {
      const detail = await uploaded.text().catch(() => '');
      console.error('[R2 upload failed]', uploaded.status, detail.slice(0, 300));
      return sendError(
        res,
        `The file could not be stored (R2 responded ${uploaded.status}). Nothing was saved.`,
        'R2_UPLOAD_FAILED',
        502
      );
    }

    const dim = dimensions(buf, actualMime);
    const publicUrl = publicUrlFor(objectKey);
    const id = `med_${crypto.randomBytes(12).toString('hex')}`;

    try {
      await query(
        `INSERT INTO media_assets
           (id, media_type, storage_provider, object_key, public_url, original_filename,
            safe_filename, mime_type, file_size, width, height, category,
            checksum, r2_object_key, r2_uploaded_at, published, active, uploaded_by,
            title, alt_text)
         VALUES ($1, $2, 'R2', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                 CURRENT_TIMESTAMP, FALSE, TRUE, $14, $15, $16)`,
        [
          id,
          ALLOWED[actualMime].type,
          objectKey,
          publicUrl,
          filename,
          objectKey.split('/').pop(),
          actualMime,
          buf.length,
          dim?.width ?? null,
          dim?.height ?? null,
          category,
          checksum,
          objectKey,
          user.id,
          // Whatever the administrator typed, never a guess about the image.
          sanitizeString(body.title, 200) || null,
          sanitizeString(body.altText, 300) || null
        ]
      );
    } catch (err) {
      // The object reached R2 but the record did not. Remove the orphan so
      // the bucket does not accumulate files nothing points at.
      console.error('[Media record failed after upload]', err.message);
      await deleteObject(objectKey).catch((cleanupErr) =>
        console.error('[R2 orphan cleanup failed]', objectKey, cleanupErr.message)
      );
      return sendError(
        res,
        'The file was uploaded but could not be recorded, so it has been removed. Please try again.',
        'MEDIA_RECORD_FAILED',
        500
      );
    }

    await logAudit(query, {
      userId: user.id,
      userName: user.name,
      action: 'Media Uploaded',
      entityType: 'Media Asset',
      entityId: id,
      metadata: { objectKey, bytes: buf.length, mime: actualMime },
      req
    });

    return sendSuccess(
      res,
      {
        item: {
          id,
          public_url: publicUrl,
          object_key: objectKey,
          media_type: ALLOWED[actualMime].type
        }
      },
      'Uploaded. It is not published until you publish it.',
      201
    );
  } catch (err) {
    console.error('[Media Upload Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'The upload could not be completed.');
  }
}
