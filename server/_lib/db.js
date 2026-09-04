/**
 * Centralized database access layer.
 *
 * PRODUCTION TARGET: Aiven PostgreSQL (via `pg`).
 * LOCAL DEVELOPMENT:  SQLite (via Node's built-in `node:sqlite`) so the app can
 *                     be developed and verified with zero infrastructure.
 *
 * The driver is chosen from DATABASE_URL:
 *   postgres://... | postgresql://...     -> PostgreSQL (production / Aiven)
 *   file:./data/temple.db | *.db|*.sqlite -> SQLite     (local only)
 *
 * Application code is driver-agnostic: every caller writes PostgreSQL-style
 * `$1, $2` placeholders and receives `{ rows: [...] }`. The SQLite adapter
 * translates placeholders and normalizes results, so moving to Aiven requires
 * changing only DATABASE_URL — no query or handler changes.
 *
 * Aiven Free Tier considerations (PostgreSQL path):
 * - Module-level singleton pool reused across warm serverless invocations.
 * - Small pool (max 5) to avoid exhausting the connection limit.
 * - Strict connection and idle timeouts.
 * - Transaction wrapper with automatic rollback.
 * - Parameterized queries only — never string concatenation.
 */

let pool = null;          // pg Pool (PostgreSQL)
let sqliteDb = null;      // DatabaseSync (SQLite)
let driver = null;        // 'postgres' | 'sqlite' | null

/**
 * Decide which driver a connection string implies.
 */
export function resolveDriver(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return null;
  if (/^postgres(ql)?:\/\//i.test(connectionString)) return 'postgres';
  if (/^file:/i.test(connectionString) || /\.(db|sqlite3?)$/i.test(connectionString)) return 'sqlite';
  // Unrecognized scheme: assume PostgreSQL so production never silently
  // falls back to a local file.
  return 'postgres';
}

export function getDriver() {
  if (!driver) driver = resolveDriver();
  return driver;
}

/* ------------------------------------------------------------------ *
 * SQLite (local development only)
 * ------------------------------------------------------------------ */

function sqliteFilePath(connectionString) {
  const raw = connectionString.replace(/^file:/i, '');
  return raw || './data/temple.db';
}

async function getSqlite() {
  if (sqliteDb) return sqliteDb;

  const { DatabaseSync } = await import('node:sqlite');
  const fs = await import('node:fs');
  const path = await import('node:path');

  const file = sqliteFilePath(process.env.DATABASE_URL);
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

  sqliteDb = new DatabaseSync(file);
  sqliteDb.exec('PRAGMA foreign_keys = ON');
  sqliteDb.exec('PRAGMA journal_mode = WAL');
  return sqliteDb;
}

/**
 * Translate PostgreSQL `$1` placeholders to SQLite `?` positional parameters.
 * Placeholders inside single-quoted string literals are left untouched.
 */
export function toSqlitePlaceholders(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") {
      inString = !inString;
      out += ch;
      continue;
    }
    if (!inString && ch === '$' && /\d/.test(text[i + 1] || '')) {
      let j = i + 1;
      while (j < text.length && /\d/.test(text[j])) j++;
      out += '?';
      i = j - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Rewrite the small set of PostgreSQL-isms used by this codebase into their
 * SQLite equivalents. Deliberately narrow and explicit — this is a local
 * development convenience, not a general-purpose SQL translator.
 */
export function toSqliteDialect(text) {
  return toSqlitePlaceholders(text)
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bTRUE\b/g, '1')
    .replace(/\bFALSE\b/g, '0')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/::[a-z_]+/gi, '');
}

/**
 * SQLite binds only null/number/bigint/string/Uint8Array. Normalize the
 * JavaScript values this app passes (booleans, Dates, JSON objects).
 */
function toSqliteParam(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function isReadQuery(text) {
  return /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)/i.test(text);
}

async function sqliteQuery(text, params) {
  const db = await getSqlite();
  const sql = toSqliteDialect(text);
  const bound = params.map(toSqliteParam);

  // RETURNING is supported by modern SQLite, so treat it as a read.
  if (isReadQuery(text) || /\bRETURNING\b/i.test(text)) {
    const rows = db.prepare(sql).all(...bound);
    return { rows, rowCount: rows.length };
  }

  const info = db.prepare(sql).run(...bound);
  return { rows: [], rowCount: Number(info.changes ?? 0) };
}

/* ------------------------------------------------------------------ *
 * PostgreSQL (production / Aiven)
 * ------------------------------------------------------------------ */

export async function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[DB] DATABASE_URL environment variable is not configured.');
    return null;
  }

  const pg = (await import('pg')).default;
  const { Pool } = pg;

  // Aiven PostgreSQL requires SSL.
  const sslConfig =
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' };

  // Strip sslmode from connectionString so pg-connection-string does not force rejectUnauthorized: true
  const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]+/i, '');

  pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: sslConfig,
    max: 5, // Aiven Free Tier: keep the pool small
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected idle PostgreSQL client error:', err.message);
  });

  return pool;
}

/* ------------------------------------------------------------------ *
 * Public API — identical shape on both drivers
 * ------------------------------------------------------------------ */

/**
 * Execute a parameterized query.
 * @param {string} text SQL with $1, $2 placeholders
 * @param {Array} params Parameter values
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
export async function query(text, params = []) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }

  const start = Date.now();
  try {
    let res;
    if (getDriver() === 'sqlite') {
      res = await sqliteQuery(text, params);
    } else {
      const p = await getPool();
      if (!p) throw new Error('DATABASE_NOT_CONFIGURED');
      res = await p.query(text, params);
    }

    if (process.env.APP_ENV === 'development') {
      const duration = Date.now() - start;
      console.log(`[SQL] (${duration}ms) ${text.slice(0, 100).replace(/\s+/g, ' ')}`);
    }
    return res;
  } catch (err) {
    console.error('[SQL Error]', err.message);
    throw err;
  }
}

/**
 * Run several statements atomically. The callback receives an object exposing
 * `.query(text, params)` on both drivers.
 */
export async function transaction(callback) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }

  if (getDriver() === 'sqlite') {
    const db = await getSqlite();
    db.exec('BEGIN');
    try {
      const result = await callback({ query: (t, p = []) => sqliteQuery(t, p) });
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('[DB Transaction Rolled Back]', err.message);
      throw err;
    }
  }

  const p = await getPool();
  if (!p) throw new Error('DATABASE_NOT_CONFIGURED');

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB Transaction Rolled Back]', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Alias for `transaction`. Some routes import this name; exporting both keeps
 * every call site working without touching handler code.
 */
export const withTransaction = transaction;

/**
 * Connectivity probe used by /api/health.
 */
export async function checkConnection() {
  if (!process.env.DATABASE_URL) {
    return { connected: false, driver: null, message: 'DATABASE_URL not configured' };
  }

  const start = Date.now();
  try {
    if (getDriver() === 'sqlite') {
      const db = await getSqlite();
      const row = db.prepare("SELECT 1 AS alive, datetime('now') AS current_time").get();
      return {
        connected: true,
        driver: 'sqlite',
        latencyMs: Date.now() - start,
        serverTime: row.current_time
      };
    }

    const p = await getPool();
    if (!p) return { connected: false, driver: 'postgres', message: 'DATABASE_URL not configured' };
    const res = await p.query('SELECT 1 as alive, NOW() as current_time');
    return {
      connected: true,
      driver: 'postgres',
      latencyMs: Date.now() - start,
      serverTime: res.rows[0].current_time
    };
  } catch (err) {
    return { connected: false, driver: getDriver(), message: err.message };
  }
}

/**
 * Close open handles (used by scripts and tests; serverless never calls this).
 */
export async function closeConnections() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
  driver = null;
}
