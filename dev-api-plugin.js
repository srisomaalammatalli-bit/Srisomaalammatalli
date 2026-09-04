/**
 * Vite dev-server plugin that serves the `api/` folder locally.
 *
 * On Vercel, each file under api/ becomes a serverless function automatically.
 * `vite` alone knows nothing about that, so during local development every
 * /api/* request 404s and the admin portal cannot log in.
 *
 * This plugin mounts the very same handler modules into Vite's dev middleware:
 * it maps the request path to a file, gives the handler the `req`/`res` shape
 * Vercel provides (parsed `req.body`, `res.status().json()`), and returns the
 * result. No handler code is duplicated or altered, so what works here works
 * in production.
 *
 * Development only — `apply: 'serve'` keeps it out of the production build,
 * and Vercel continues to route api/ itself when deployed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, 'api');

/** Read and JSON-parse the request body, mirroring Vercel's behaviour. */
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString('utf8');
      const type = req.headers['content-type'] || '';
      if (type.includes('application/json')) {
        try {
          return resolve(JSON.parse(raw));
        } catch {
          return resolve(undefined);
        }
      }
      if (type.includes('application/x-www-form-urlencoded')) {
        return resolve(Object.fromEntries(new URLSearchParams(raw)));
      }
      resolve(raw);
    });
    req.on('error', () => resolve(undefined));
  });
}

/**
 * Resolve /api/events -> api/events/index.js | api/events.js
 * and /api/gallery/gal_123 -> api/gallery/index.js with query.id set.
 */
function resolveHandlerFile(pathname) {
  const rel = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const segments = rel ? rel.split('/') : [];

  const candidates = [];
  if (segments.length) {
    candidates.push({ file: path.join(API_DIR, ...segments, 'index.js'), id: null });
    candidates.push({ file: path.join(API_DIR, ...segments) + '.js', id: null });
    if (segments.length > 1) {
      // Treat the last segment as a record id for /api/<resource>/<id>.
      const parent = segments.slice(0, -1);
      const id = segments[segments.length - 1];
      candidates.push({ file: path.join(API_DIR, ...parent, 'index.js'), id });
      candidates.push({ file: path.join(API_DIR, ...parent) + '.js', id });
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.file)) return candidate;
  }
  return null;
}

/** Give the handler the response API Vercel exposes. */
function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = (payload) => {
    if (payload && typeof payload === 'object') return res.json(payload);
    res.end(String(payload));
    return res;
  };
  return res;
}

export default function devApiPlugin() {
  return {
    name: 'temple-dev-api',
    apply: 'serve', // never runs in `vite build`

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        const match = resolveHandlerFile(url.pathname);
        if (!match) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              success: false,
              error: { code: 'NOT_FOUND', message: `No API handler for ${url.pathname}` }
            })
          );
        }

        try {
          // Load through Vite so handler edits apply without a restart.
          const module = await server.ssrLoadModule(match.file);
          const handler = module.default;
          if (typeof handler !== 'function') {
            throw new Error(`${path.basename(match.file)} has no default export`);
          }

          req.query = Object.fromEntries(url.searchParams);
          if (match.id) req.query.id = match.id;
          req.body = await readBody(req);

          decorateResponse(res);
          await handler(req, res);

          if (!res.writableEnded) res.end();
        } catch (err) {
          server.config.logger.error(`[dev-api] ${url.pathname}: ${err.message}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          if (!res.writableEnded) {
            res.end(
              JSON.stringify({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: err.message }
              })
            );
          }
        }
      });
    }
  };
}
