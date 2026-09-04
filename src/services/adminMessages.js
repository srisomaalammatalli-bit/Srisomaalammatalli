/**
 * Turns an API error into a sentence a temple committee member can act on.
 *
 * The people who operate this site are not developers. A code like
 * MEDIA_IN_USE, or a bare 500, tells them nothing about what went wrong or
 * what to do next — and an alarming failure makes a volunteer afraid they
 * have broken something. Every message below says what happened and, where
 * there is one, what the administrator can do about it.
 *
 * One constraint shapes this file. `sendError` in api/_lib/response.js
 * attaches `details` ONLY when APP_ENV is development, so nothing here may
 * depend on `details` to produce a usable sentence: a message built from it
 * would read correctly on this machine and degrade in production. Where the
 * server already writes a specific, devotee-readable message (it does for
 * MEDIA_IN_USE, which names the pages using the image), that message is kept
 * and given the actionable advice the server does not carry.
 *
 * Anything unrecognised falls back to the server's own text, so a new error
 * is never flattened into a vague "something went wrong".
 */

/** Field names as an administrator would say them, not as the database does. */
const FIELD_LABELS = {
  name: 'name',
  title: 'title',
  price: 'price',
  amount: 'amount',
  event_date: 'event date',
  pooja_time: 'pooja time',
  category: 'category',
  media_url: 'image',
  thumbnail_url: 'thumbnail',
  youtube_url: 'YouTube link',
  video_url: 'video link',
  phone: 'phone number',
  email: 'email address',
  display_order: 'display order',
  description: 'description'
};

export function fieldLabel(key) {
  if (!key) return 'One of the fields';
  return FIELD_LABELS[key] || key.replace(/_/g, ' ');
}

/**
 * Each entry receives the server's message and returns what to show. Keeping
 * `serverMessage` in the signature lets a handler pass through detail the
 * server genuinely knows and this file cannot reconstruct.
 */
const MESSAGES = {
  // The server names the exact pages using the image, which is the part this
  // file cannot reconstruct. Its list is kept and its developer-facing tail
  // ("or confirm to continue anyway") is replaced with plain advice.
  MEDIA_IN_USE: (serverMessage) => {
    const places = String(serverMessage || '')
      // Drop the server's own lead-in and its developer-facing tail, keeping
      // only the list of pages — the part this file cannot reconstruct.
      .replace(/^.*?currently used by:\s*/i, '')
      .replace(/\s*Remove those references first.*$/i, '')
      .replace(/\.\s*$/, '')
      .trim();
    return (
      'This image is currently being used on the website and cannot be archived yet.' +
      (places ? ` It is used by: ${places}.` : '') +
      ' Remove it from those places first, and it can then be archived safely.'
    );
  },

  // Raised when a resource refuses its own removal because other content
  // depends on it. The server counts what is affected and this file cannot,
  // so its message is already the useful one.
  DELETE_BLOCKED: (serverMessage) =>
    serverMessage || 'This cannot be removed yet because other content depends on it.',

  R2_NOT_CONFIGURED: () =>
    'Photo upload is temporarily unavailable. The image storage service has not been set up yet — ' +
    'please contact the website administrator. Nothing you have entered has been lost.',

  // Validation messages are written for the administrator at the point they
  // are raised, so the server's wording is the best available.
  VALIDATION_ERROR: (serverMessage) =>
    serverMessage || 'Some of the information entered is not valid. Please check the form and try again.',

  BAD_REQUEST: (serverMessage) =>
    serverMessage || 'Some of the information entered is not valid. Please check the form and try again.',

  DATABASE_NOT_CONFIGURED: () =>
    'The website cannot reach its database at the moment. Please contact the website administrator. ' +
    'No changes have been saved.',

  UNAUTHORIZED: () =>
    'Your session has expired. Please sign in again — your work has not been saved.',

  FORBIDDEN: () =>
    'Your account does not have permission to make this change. Please ask a temple administrator.',

  NOT_FOUND: () =>
    'That item no longer exists — it may have been removed by another committee member. ' +
    'Please refresh the page.',

  METHOD_NOT_ALLOWED: () => 'That action is not available on this screen.',

  RATE_LIMITED: () =>
    'Too many attempts in a short time. Please wait a minute and try again.',

  NETWORK_ERROR: () =>
    'The website could not be reached. Please check your internet connection and try again. ' +
    'Nothing has been saved.',

  INTERNAL_ERROR: () =>
    'The website ran into a problem while saving. Please try again in a moment. ' +
    'If it keeps happening, contact the website administrator.'
};

/**
 * @param {unknown} err        the caught error, normally an ApiError
 * @param {string}  [fallback] what to say when nothing else fits
 */
export function adminErrorMessage(err, fallback = 'The change could not be saved. Please try again.') {
  if (!err) return fallback;

  const raw = String(err.message || '');
  const code = err.code || '';

  const build = MESSAGES[code];
  if (build) return build(raw);

  // A foreign-key refusal means the record is protecting something real —
  // usually a booking or receipt that must not be orphaned. Say so, and point
  // at the safe alternative rather than leaving a dead end.
  if (/FOREIGN KEY|foreign key constraint/i.test(raw)) {
    return (
      'This cannot be deleted because other records depend on it — for example bookings or ' +
      'receipts that must be kept. You can hide it from the website instead by unpublishing it.'
    );
  }

  if (/^HTTP_5/.test(code)) return MESSAGES.INTERNAL_ERROR();

  return raw || fallback;
}

export default adminErrorMessage;
