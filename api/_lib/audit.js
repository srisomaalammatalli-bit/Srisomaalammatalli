/**
 * Append-only audit logger for administrative and financial actions.
 *
 * Records who did what, to which entity, and when. Never records passwords,
 * password hashes, session tokens or cookie values.
 *
 * The first argument accepts either form used across the routes:
 *   - the `query(text, params)` function exported by _lib/db.js
 *   - a transaction client/object exposing `.query(text, params)`
 *
 * Audit failures are logged but never thrown: a bookkeeping problem must not
 * fail the caller's real work.
 */

import crypto from 'crypto';

/** Keys that must never be persisted, whatever a caller passes in metadata. */
const REDACTED_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'tokenhash',
  'token_hash',
  'secret',
  'sessionsecret',
  'session_secret',
  'cookie',
  'authorization',
  'apikey',
  'api_key'
];

/**
 * Remove sensitive values from audit metadata, recursively.
 */
export function sanitizeMetadata(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map((v) => sanitizeMetadata(v, depth + 1));
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z_]/g, '');
    out[key] = REDACTED_KEYS.includes(normalized) ? '[redacted]' : sanitizeMetadata(val, depth + 1);
  }
  return out;
}

/**
 * Normalize the executor into a callable `(text, params) => Promise`.
 */
function toRunner(dbClientOrQuery) {
  if (typeof dbClientOrQuery === 'function') {
    return (text, params) => dbClientOrQuery(text, params);
  }
  if (dbClientOrQuery && typeof dbClientOrQuery.query === 'function') {
    return (text, params) => dbClientOrQuery.query(text, params);
  }
  return null;
}

export async function logAudit(dbClientOrQuery, {
  userId = null,
  userName = 'System',
  action,
  entityType = 'SYSTEM',
  entityId = null,
  metadata = {},
  req = null
}) {
  try {
    const run = toRunner(dbClientOrQuery);
    if (!run) {
      console.error('[Audit Log Error] No usable database executor was provided.');
      return;
    }

    const id = 'aud_' + crypto.randomBytes(16).toString('hex');

    // x-forwarded-for may be a comma-separated chain; the client is first.
    const forwarded = req?.headers?.['x-forwarded-for'] || '';
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : String(forwarded).split(',')[0].trim()) ||
      req?.socket?.remoteAddress ||
      '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        userId,
        userName,
        action,
        entityType,
        entityId ? String(entityId) : null,
        JSON.stringify(sanitizeMetadata(metadata)),
        String(ip).slice(0, 45),
        String(userAgent).slice(0, 512)
      ]
    );
  } catch (err) {
    // Deliberately swallowed: never fail the caller's operation over an audit row.
    console.error('[Audit Log Error]', err.message);
  }
}
