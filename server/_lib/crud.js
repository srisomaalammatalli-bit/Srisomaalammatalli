/**
 * Shared CRUD scaffolding for the content endpoints
 * (gallery, videos, poojas, timings, financial records).
 *
 * Every route needs the same shape: a public GET that returns only published
 * rows, and authenticated POST / PUT / DELETE that validate input, write via
 * parameterized SQL, and record an audit entry. Rather than repeat that in five
 * files, each route declares a small resource descriptor and delegates here.
 *
 * Security invariants enforced in one place:
 * - Column names come only from the route's own whitelist, never from the
 *   request, so a caller can never inject SQL through a field name.
 * - Values are always bound as parameters.
 * - Writes require an authenticated session; role checks are applied when the
 *   descriptor asks for them.
 */

import crypto from 'crypto';
import { query } from './db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendMethodNotAllowed
} from './response.js';
import { getAuthenticatedUser, hasRequiredRole } from './auth.js';
import { logAudit } from './audit.js';

/** Generate a prefixed, collision-resistant identifier. */
export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Read the trailing path segment as a record id, e.g. /api/gallery/gal_abc.
 * Vercel exposes it via req.query.id for `[id].js` routes; we also parse the
 * URL so a single index handler can serve both shapes.
 *
 * The segment must actually look like a generated id. Counting segments is
 * not enough: a nested route such as /api/temple/history has three segments
 * too, and reading "history" as a record id made every PUT and DELETE on
 * those routes address a record that does not exist — silently, because the
 * id from the request body was then never consulted.
 *
 * Ids are minted by newId() as `<prefix>_<hex>`, so that shape is the test.
 */
const ID_PATTERN = /^[a-z]{2,8}_[0-9a-f]{8,}$/i;

export function extractId(req) {
  if (req.query?.id) return String(req.query.id);
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  // ['api', '<resource>', …, '<id>']
  if (segments.length < 3) return null;
  const last = segments[segments.length - 1];
  return ID_PATTERN.test(last) ? last : null;
}

/**
 * Keep only whitelisted fields, mapping request keys to column names.
 *
 * A field may declare `validate(transformedValue, rawValue, body)` returning an
 * error string. Doing the check here means bad input is rejected as a 400 before
 * it reaches SQL, instead of surfacing as a constraint violation and a 500.
 *
 * A field may also declare `derivedFrom: '<requestKey>'`. Such a column is
 * computed from a sibling the caller *did* send — a YouTube video id taken from
 * the submitted URL, a slug taken from the name — and is never read from the
 * request directly. Deriving them here rather than in each route means the
 * derived value is also *validated* here: without this, a field the caller
 * simply omits would skip its own validation, and an unrecognised URL would be
 * stored instead of refused.
 *
 * @param {object} body Request body
 * @param {object} fieldMap { requestKey: { column, transform?, validate?, derivedFrom? } }
 * @param {boolean} isCreate Derived columns are filled in on create; on update
 *                           they are recomputed only when their source is sent.
 * @returns {{columns: string[], values: any[], errors: string[]}}
 */
function pickFields(body, fieldMap, isCreate = false) {
  const columns = [];
  const values = [];
  const errors = [];

  for (const [key, spec] of Object.entries(fieldMap)) {
    const source = spec.derivedFrom;

    if (source) {
      // Recompute whenever the source arrives; on create, also when it is
      // absent, so a NOT NULL column still receives a value.
      if (body[source] === undefined && !isCreate) continue;
    } else if (body[key] === undefined) {
      continue;
    }

    // A derived column reads its sibling, never its own request key, so a
    // caller cannot set it directly.
    const raw = source ? body[source] : body[key];
    // The whole body is passed so a transform can consult other fields.
    const value = spec.transform ? spec.transform(raw, body) : raw;

    if (spec.validate) {
      const problem = spec.validate(value, raw, body);
      if (problem) {
        errors.push(problem);
        continue;
      }
    }

    columns.push(spec.column);
    values.push(value);
  }
  return { columns, values, errors };
}

/**
 * Build and run a resource handler.
 *
 * @param {object} config
 * @param {string} config.table              Table name (from code, never user input)
 * @param {string} config.idPrefix           Prefix for generated ids
 * @param {string} config.entityType         Audit entity label, e.g. 'Gallery'
 * @param {string} config.publicSelect       Columns exposed publicly
 * @param {string} [config.publicWhere]      Extra public filter, e.g. 'published = TRUE'
 * @param {string} [config.orderBy]          ORDER BY clause
 * @param {object} config.fields             Writable field whitelist
 * @param {string[]} config.requiredOnCreate Request keys required by POST
 * @param {string[]} [config.writeRoles]     Roles permitted to write
 */
export function createResourceHandler(config) {
  const {
    table,
    idPrefix,
    entityType,
    publicSelect,
    publicWhere = null,
    orderBy = 'created_at DESC',
    fields,
    requiredOnCreate = [],
    writeRoles = ['admin', 'finance_manager'],
    // Optional. Called before a removal with (id, { query, force }). Returning
    // a string refuses the request with that message and a 409; returning
    // nothing lets it proceed. A resource whose rows are referenced by other
    // content uses this to tell the operator what would be affected, rather
    // than letting a foreign-key violation surface as a 500 — or, where no
    // constraint exists, letting the row vanish and silently orphan whatever
    // pointed at it.
    beforeDelete = null,
    // Optional. Called before a create with (body, { query }). Returning a
    // string refuses it as a 400 carrying that message — used where a unique
    // index would otherwise surface an ordinary mistake as an opaque 500.
    beforeCreate = null
  } = config;

  async function requireWriter(req, res) {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      sendUnauthorized(res, 'Authentication required.');
      return null;
    }
    if (!hasRequiredRole(user, writeRoles)) {
      sendForbidden(res, 'Your role does not permit this action.');
      return null;
    }
    return user;
  }

  return async function handler(req, res) {
    try {
      /* ---------------- READ (public) ---------------- */
      if (req.method === 'GET') {
        // Admin sessions see unpublished rows too.
        const user = await getAuthenticatedUser(req).catch(() => null);
        const where = user || !publicWhere ? '' : ` WHERE ${publicWhere}`;
        const result = await query(
          `SELECT ${publicSelect} FROM ${table}${where} ORDER BY ${orderBy}`
        );
        return sendSuccess(res, { items: result.rows, count: result.rows.length });
      }

      /* ---------------- CREATE ---------------- */
      if (req.method === 'POST') {
        const user = await requireWriter(req, res);
        if (!user) return;

        const body = req.body || {};
        const missing = requiredOnCreate.filter(
          (k) => body[k] === undefined || body[k] === null || String(body[k]).trim() === ''
        );
        if (missing.length) {
          return sendBadRequest(res, `Missing required field(s): ${missing.join(', ')}.`);
        }

        const { columns, values, errors } = pickFields(body, fields, true);
        if (errors.length) return sendBadRequest(res, errors.join(' '));
        if (!columns.length) return sendBadRequest(res, 'No valid fields supplied.');

        // A resource may refuse a create it knows will fail — a duplicate the
        // database would reject with a constraint violation, which reaches the
        // operator as an unhelpful 500.
        if (beforeCreate) {
          const objection = await beforeCreate(body, { query });
          if (objection) return sendBadRequest(res, objection);
        }

        const id = newId(idPrefix);
        const allColumns = ['id', ...columns];
        const placeholders = allColumns.map((_, i) => `$${i + 1}`).join(', ');

        const result = await query(
          `INSERT INTO ${table} (${allColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          [id, ...values]
        );

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: `${entityType} Created`,
          entityType,
          entityId: id,
          metadata: { fields: columns },
          req
        });

        return sendSuccess(res, { item: result.rows[0] ?? { id } }, `${entityType} created successfully`, 201);
      }

      /* ---------------- UPDATE ---------------- */
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const user = await requireWriter(req, res);
        if (!user) return;

        const id = extractId(req) || (req.body || {}).id;
        if (!id) return sendBadRequest(res, 'A record id is required.');

        const { columns, values, errors } = pickFields(req.body || {}, fields);
        if (errors.length) return sendBadRequest(res, errors.join(' '));
        if (!columns.length) return sendBadRequest(res, 'No valid fields supplied.');

        const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const result = await query(
          `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`,
          [...values, id]
        );

        if (!result.rows.length && result.rowCount === 0) {
          return sendNotFound(res, `${entityType} not found.`);
        }

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: `${entityType} Updated`,
          entityType,
          entityId: id,
          metadata: { fields: columns },
          req
        });

        return sendSuccess(res, { item: result.rows[0] ?? { id } }, `${entityType} updated successfully`);
      }

      /* ---------------- DELETE ---------------- */
      if (req.method === 'DELETE') {
        const user = await requireWriter(req, res);
        if (!user) return;

        const id = extractId(req) || (req.body || {}).id;
        if (!id) return sendBadRequest(res, 'A record id is required.');

        // A resource may object to its own removal, or explain what it
        // affects. ?force=1 is the operator confirming after being told.
        if (beforeDelete) {
          const force = /[?&]force=1(&|$)/.test(req.url || '');
          const objection = await beforeDelete(id, { query, force });
          if (objection) return sendError(res, objection, 'DELETE_BLOCKED', 409);
        }

        const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
        if (!result.rows.length && result.rowCount === 0) {
          return sendNotFound(res, `${entityType} not found.`);
        }

        await logAudit(query, {
          userId: user.id,
          userName: user.name,
          action: `${entityType} Deleted`,
          entityType,
          entityId: id,
          metadata: {},
          req
        });

        return sendSuccess(res, { deleted: id }, `${entityType} deleted successfully`);
      }

      return sendMethodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
    } catch (err) {
      console.error(`[${entityType} Error]`, err);
      if (err.message === 'DATABASE_NOT_CONFIGURED') {
        return sendError(res, 'The database is not configured.', 'DATABASE_NOT_CONFIGURED', 503);
      }
      return sendError(res, `Failed to process the ${entityType.toLowerCase()} request.`);
    }
  };
}
