/**
 * Migration runner.
 *
 * Applies database/migrations/*.sql in filename order, tracking applied files
 * in a `_migrations` table so re-runs are idempotent.
 *
 * Works against both targets, chosen from DATABASE_URL:
 *   postgres://...            -> Aiven PostgreSQL (production)
 *   file:./data/temple.db     -> SQLite            (local development)
 *
 * One canonical PostgreSQL schema is the source of truth. For SQLite the
 * statements are translated on the fly (see translateForSqlite) so the two
 * environments can never drift apart.
 *
 * Usage:  npm run migrate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv();

/**
 * Split a SQL file into individual statements, ignoring semicolons that appear
 * inside string literals or line comments.
 */
export function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (!inString && ch === '-' && next === '-') {
      inLineComment = true;
      current += ch;
      continue;
    }
    if (ch === "'") {
      inString = !inString;
      current += ch;
      continue;
    }
    if (!inString && ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Translate the PostgreSQL DDL used by this project into SQLite-compatible DDL.
 * Intentionally narrow: it covers exactly the constructs in our schema.
 * Returns null for statements SQLite should skip entirely.
 */
export function translateForSqlite(stmt) {
  // A statement the two engines cannot express the same way is written twice
  // and tagged, rather than forced into a lowest common denominator. Dropping
  // a CHECK constraint is the case that needs this: PostgreSQL uses
  // ALTER TABLE ... DROP CONSTRAINT, while SQLite must rebuild the table.
  //
  //   -- @pg-only      applied on PostgreSQL, skipped here
  //   -- @sqlite-only  applied here, skipped on PostgreSQL
  //
  // The marker is a comment on its own line above the statement; the splitter
  // keeps comments attached, so it is still visible here.
  if (/--\s*@pg-only\b/i.test(stmt)) return null;

  // Strip comment-only statements.
  const bare = stmt.replace(/--[^\n]*/g, '').trim();
  if (!bare) return null;

  // PostgreSQL-only server features.
  if (/^CREATE\s+EXTENSION/i.test(bare)) return null;
  if (/^SET\s+/i.test(bare)) return null;
  if (/^COMMENT\s+ON/i.test(bare)) return null;

  return bare
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bTIMESTAMP\s+WITH\s+TIME\s+ZONE\b/gi, 'TEXT')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bUUID\b/gi, 'TEXT')
    .replace(/\bBIGSERIAL\b/gi, 'INTEGER')
    .replace(/\bSERIAL\b/gi, 'INTEGER')
    .replace(/\bNUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL')
    .replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER')
    .replace(/\bCURRENT_DATE\b/gi, "(date('now'))")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "(datetime('now'))")
    .replace(/\bNOW\(\)/gi, "(datetime('now'))")
    .replace(/\bDEFAULT\s+TRUE\b/gi, 'DEFAULT 1')
    .replace(/\bDEFAULT\s+FALSE\b/gi, 'DEFAULT 0')
    .replace(/\bgen_random_uuid\(\)/gi, "(lower(hex(randomblob(16))))")
    .replace(/\buuid_generate_v4\(\)/gi, "(lower(hex(randomblob(16))))");
}

/* ------------------------------------------------------------------ */

async function openSqlite(connectionString) {
  const { DatabaseSync } = await import('node:sqlite');
  const file = connectionString.replace(/^file:/i, '') || './data/temple.db';
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  return { db, file };
}

async function migrateSqlite(connectionString, files, migrationsDir) {
  const { db, file } = await openSqlite(connectionString);
  console.log(`Connected to SQLite database for migration: ${file}`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  let applied = 0;
  for (const fileName of files) {
    const already = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(fileName);
    if (already) {
      console.log(`  - ${fileName} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
    const statements = splitStatements(sql);

    db.exec('BEGIN');
    try {
      for (const raw of statements) {
        const translated = translateForSqlite(raw);
        if (!translated) continue;
        db.exec(translated);
      }
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(fileName);
      db.exec('COMMIT');
      applied++;
      console.log(`  ✓ ${fileName} applied (${statements.length} statements)`);
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`  ✗ ${fileName} failed: ${err.message}`);
      throw err;
    }
  }

  db.close();
  return applied;
}

async function migratePostgres(connectionString, files, migrationsDir) {
  const pg = (await import('pg')).default;
  const { Pool } = pg;

  const sslConfig =
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' };

  const pool = new Pool({ connectionString, ssl: sslConfig, max: 2, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  console.log('Connected to PostgreSQL database for migration.');

  let applied = 0;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const fileName of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [fileName]);
      if (rows.length) {
        console.log(`  - ${fileName} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
      await client.query('BEGIN');
      try {
        // Statements marked @sqlite-only exist to work around SQLite's lack
        // of ALTER TABLE ... DROP CONSTRAINT; PostgreSQL uses the @pg-only
        // form of the same change and must not run both.
        for (const statement of splitStatements(sql)) {
          if (/--\s*@sqlite-only\b/i.test(statement)) continue;
          const bare = statement.replace(/--[^\n]*/g, '').trim();
          if (!bare) continue;
          await client.query(bare);
        }
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [fileName]);
        await client.query('COMMIT');
        applied++;
        console.log(`  ✓ ${fileName} applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${fileName} failed: ${err.message}`);
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
  return applied;
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not defined.');
    console.error('Local development:  DATABASE_URL=file:./data/temple.db');
    console.error('Production (Aiven): DATABASE_URL=postgres://...');
    process.exitCode = 1;
    return;
  }

  const isSqlite = /^file:/i.test(connectionString) || /\.(db|sqlite3?)$/i.test(connectionString);
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.warn('No migration files found in database/migrations/.');
    return;
  }

  console.log(`Running ${files.length} migration file(s) against ${isSqlite ? 'SQLite' : 'PostgreSQL'}...`);

  const applied = isSqlite
    ? await migrateSqlite(connectionString, files, migrationsDir)
    : await migratePostgres(connectionString, files, migrationsDir);

  console.log(applied === 0 ? 'Database already up to date.' : `Migration complete: ${applied} file(s) applied.`);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
});
