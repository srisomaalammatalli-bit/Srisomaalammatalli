/**
 * Standard HTTP JSON response helpers for the Vercel serverless functions.
 *
 * Enforces one payload shape across every endpoint and prevents internal
 * database errors from leaking to clients.
 *
 * Success:  { "success": true,  "data": { ... }, "message"?: "..." }
 * Error:    { "success": false, "error": { "code": "...", "message": "..." } }
 */

/**
 * Send a success payload.
 *
 * The optional third argument may be either a human-readable message or the
 * HTTP status code, because routes use both forms:
 *
 *   sendSuccess(res, { events })
 *   sendSuccess(res, { event }, 'Event created successfully', 201)
 *   sendSuccess(res, { event }, 201)
 *
 * @param {object} res            Response object
 * @param {object} data           Payload body
 * @param {string|number} [messageOrStatus]
 * @param {number} [statusCode=200]
 * @param {object|null} [meta]    Optional pagination/context metadata
 */
export function sendSuccess(res, data = {}, messageOrStatus, statusCode = 200, meta = null) {
  let message = null;
  let status = statusCode;

  if (typeof messageOrStatus === 'number') {
    status = messageOrStatus;
  } else if (typeof messageOrStatus === 'string') {
    message = messageOrStatus;
  }

  res.setHeader('Content-Type', 'application/json');

  // CMS content is mutable, and the whole point of the admin portal is that a
  // change is visible at once. A CDN or browser holding a cached copy would
  // make an administrator think their edit did not save, so responses are
  // no-store unless a route has deliberately set something else.
  //
  // This is correctness over bandwidth: these payloads are small, and every
  // one of them is something the temple can edit. It also covers session and
  // receipt responses, where caching would be worse still.
  if (typeof res.getHeader !== 'function' || !res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  }

  const payload = { success: true, data };
  if (message) payload.message = message;
  if (meta) payload.meta = meta;

  return res.status(status).json(payload);
}

/**
 * Send an error payload.
 *
 * Routes call this in two shapes, so both are supported:
 *
 *   sendError(res, 'Failed to create event.')            // 500 by default
 *   sendError(res, 'Method not allowed', 405)
 *   sendError(res, 'Invalid input', 'VALIDATION_ERROR', 400)
 *
 * A bare `sendError(res, message)` is treated as a server-side failure (500)
 * and its text is masked outside development, so database errors never reach
 * the browser.
 *
 * @param {object} res
 * @param {string} message
 * @param {string|number} [codeOrStatus]
 * @param {number} [statusCode]
 * @param {*} [details] Included only in development
 */
export function sendError(res, message, codeOrStatus, statusCode, details = null) {
  let code;
  let status;

  if (typeof codeOrStatus === 'number') {
    status = codeOrStatus;
    code = httpErrorCode(status);
  } else if (typeof codeOrStatus === 'string') {
    code = codeOrStatus;
    status = typeof statusCode === 'number' ? statusCode : 400;
  } else {
    // sendError(res, message) — an unexpected server failure.
    status = 500;
    code = 'INTERNAL_ERROR';
  }

  res.setHeader('Content-Type', 'application/json');

  // Never surface internal failure details outside development.
  const clientMessage =
    status >= 500 && process.env.APP_ENV !== 'development'
      ? 'An unexpected server error occurred. Please try again later.'
      : message;

  const payload = { success: false, error: { code, message: clientMessage } };

  if (details && process.env.APP_ENV === 'development') {
    payload.error.details = details;
  }

  return res.status(status).json(payload);
}

function httpErrorCode(status) {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 405: return 'METHOD_NOT_ALLOWED';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    default:  return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
  }
}

/** 400 — the request body or query failed validation. */
export function sendBadRequest(res, message = 'Invalid request.', details = null) {
  return sendError(res, message, 'VALIDATION_ERROR', 400, details);
}

/** 401 — authentication is missing or invalid. */
export function sendUnauthorized(res, message = 'Authentication required.') {
  return sendError(res, message, 'UNAUTHORIZED', 401);
}

/** 403 — authenticated, but not permitted. */
export function sendForbidden(res, message = 'You do not have permission to perform this action.') {
  return sendError(res, message, 'FORBIDDEN', 403);
}

/** 404 — resource does not exist. */
export function sendNotFound(res, message = 'The requested resource was not found.') {
  return sendError(res, message, 'NOT_FOUND', 404);
}

/** 405 — wrong HTTP verb; sets the Allow header. */
export function sendMethodNotAllowed(res, allowed = []) {
  if (allowed.length) res.setHeader('Allow', allowed);
  return sendError(res, 'Method not allowed.', 'METHOD_NOT_ALLOWED', 405);
}
