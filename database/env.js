/**
 * Minimal .env loader for local CLI scripts (migrate / seed).
 *
 * Deliberately dependency-free — `dotenv` is not needed for a handful of
 * KEY=VALUE lines. On Vercel the platform injects environment variables
 * directly, so this is effectively a no-op there.
 *
 * Values already present in process.env always win, so a real deployment
 * environment is never overridden by a stray local file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Parse .env contents into a plain object.
 * Supports `#` comments, blank lines, an optional `export ` prefix,
 * and single/double quoted values.
 */
export function parseEnv(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.replace(/^export\s+/, '');
    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!key) continue;

    let value = withoutExport.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      // Strip a trailing inline comment on unquoted values.
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trim();
    }

    out[key] = value;
  }
  return out;
}

/**
 * Load .env into process.env.
 * Returns the list of keys applied (names only — never values).
 */
export function loadEnv(fileName = '.env') {
  const filePath = path.join(PROJECT_ROOT, fileName);
  if (!fs.existsSync(filePath)) return [];

  const parsed = parseEnv(fs.readFileSync(filePath, 'utf8'));
  const applied = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
      applied.push(key);
    }
  }
  return applied;
}
