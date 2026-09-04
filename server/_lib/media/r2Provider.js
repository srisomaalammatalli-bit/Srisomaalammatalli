/**
 * Cloudflare R2 media provider.
 *
 * R2 speaks the S3 API, so uploads are authorised with AWS Signature V4.
 * The signing is implemented here with Node's built-in `crypto` rather than
 * pulling in the AWS SDK: it is a few dozen lines of HMAC, and the SDK would
 * add megabytes to a serverless bundle for one operation.
 *
 * How an upload works:
 *
 *   1. The admin's browser asks our API for permission to upload.
 *   2. The API checks the admin session, validates the file's type and size,
 *      and returns a short-lived presigned PUT URL.
 *   3. The browser PUTs the file straight to R2 — the file never passes
 *      through a Vercel function, so large videos are not a problem.
 *   4. The API records the object's metadata in PostgreSQL.
 *
 * Credentials live only in server-side environment variables. Nothing here is
 * ever sent to the browser except the presigned URL itself, which is scoped to
 * one object key, one method and a few minutes.
 */

import crypto from 'crypto';

const SERVICE = 's3';
const REGION = 'auto'; // R2 uses a single logical region
const ALGORITHM = 'AWS4-HMAC-SHA256';

/** True when every server-side R2 variable is present. */
export function isConfigured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

/**
 * Public base URL for reading objects.
 *
 * Production should point this at a Cloudflare custom domain (media.example.org)
 * rather than the r2.dev development URL, which is rate-limited and not meant
 * for production traffic.
 */
export function publicBaseUrl() {
  return (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

/** Full public URL for a stored object. */
export function publicUrlFor(objectKey) {
  const base = publicBaseUrl();
  return base ? `${base}/${objectKey}` : null;
}

/* ------------------------------------------------------------------ *
 * AWS Signature V4
 * ------------------------------------------------------------------ */

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();

/**
 * Percent-encode per RFC 3986, which is stricter than encodeURIComponent.
 * Slashes are preserved in object keys when `encodeSlash` is false.
 */
export function uriEncode(value, encodeSlash = true) {
  return String(value)
    .split('')
    .map((ch) => {
      if (/[A-Za-z0-9\-._~]/.test(ch)) return ch;
      if (ch === '/') return encodeSlash ? '%2F' : '/';
      return Array.from(Buffer.from(ch, 'utf8'))
        .map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`)
        .join('');
    })
    .join('');
}

/** Derive the SigV4 signing key for a given date. */
function signingKey(secret, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/**
 * Build a presigned URL (query-string authentication).
 *
 * Exported with explicit parameters so it can be tested against AWS's own
 * published example vectors, which is the only reliable way to know the
 * signature is correct before pointing it at a real bucket.
 */
export function presign({
  method,
  host,
  path,
  accessKeyId,
  secretAccessKey,
  region = REGION,
  service = SERVICE,
  expiresIn = 600,
  amzDate,
  extraQuery = {}
}) {
  const stamp = amzDate || new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = stamp.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const query = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': stamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
    ...extraQuery
  };

  // Canonical query string: sorted by key, both key and value URI-encoded.
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join('&');

  const canonicalPath = uriEncode(path, false);
  const canonicalRequest = [
    method,
    canonicalPath,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [ALGORITHM, stamp, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const signature = crypto
    .createHmac('sha256', signingKey(secretAccessKey, dateStamp, region, service))
    .update(stringToSign)
    .digest('hex');

  return `https://${host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/* ------------------------------------------------------------------ *
 * Object keys
 * ------------------------------------------------------------------ */

/** Strip anything that would be awkward or unsafe in a URL path segment. */
function safeName(filename) {
  return (
    String(filename || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'file'
  );
}

/**
 * Build a unique, date-partitioned object key.
 *
 *   temple/gallery/2026/09/3f2a...-jathara-2026.jpg
 *
 * The uuid makes every upload a distinct object, so replacing an image never
 * collides with a cached copy of the old one.
 */
export function buildObjectKey(category, filename, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID();
  return `temple/${category}/${year}/${month}/${id}-${safeName(filename)}`;
}

/* ------------------------------------------------------------------ *
 * Provider operations
 * ------------------------------------------------------------------ */

/**
 * A short-lived URL the browser may PUT one object to.
 * The key is chosen by the server, so a caller cannot overwrite arbitrary
 * objects by supplying their own path.
 */
export async function createUploadUrl({ objectKey, expiresIn = 600 }) {
  if (!isConfigured()) {
    throw new Error('R2_NOT_CONFIGURED');
  }

  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${process.env.R2_BUCKET_NAME}/${objectKey}`;

  const uploadUrl = presign({
    method: 'PUT',
    host,
    path,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    expiresIn
  });

  return {
    uploadUrl,
    objectKey,
    publicUrl: publicUrlFor(objectKey),
    expiresIn,
    method: 'PUT'
  };
}

/** Permanently remove an object. Callers must check references first. */
export async function deleteObject(objectKey) {
  if (!isConfigured()) throw new Error('R2_NOT_CONFIGURED');

  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = presign({
    method: 'DELETE',
    host,
    path: `/${process.env.R2_BUCKET_NAME}/${objectKey}`,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    expiresIn: 120
  });

  const res = await fetch(url, { method: 'DELETE' });
  // R2 answers 204 on success and on an object that was already absent.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed with status ${res.status}`);
  }
  return { deleted: true, objectKey };
}

export const PROVIDER_NAME = 'CLOUDFLARE_R2';

export const capabilities = Object.freeze({
  presignedUpload: true,
  serverSideDelete: true,
  publicUrls: true
});
