/**
 * Shared evidence vocabulary for historical content.
 *
 * Where a claim came from and how far it can be trusted are the two things
 * this archive exists to keep straight, so both are validated in one place
 * rather than being re-listed in each route. The values match the CHECK
 * constraints in migration 005: rejecting an unknown value here turns a
 * typo into a 400 with a readable message instead of a constraint error, and
 * stops a claim reaching the page with a status the badge component cannot
 * label.
 */

import { sanitizeString } from './validation.js';

/** Where a statement came from. */
export const SOURCE_TYPES = Object.freeze([
  'Primary Source',
  'Government Record',
  'Newspaper',
  'Book',
  'Academic Source',
  'Local Historical Source',
  'Oral History',
  'Video',
  'Community Source',
  'User Submitted',
  'Unverified'
]);

/** How far a statement can be trusted. */
export const VERIFICATION_STATUSES = Object.freeze([
  'Verified',
  'Source-backed',
  'Partially Documented',
  'Oral Tradition',
  'Needs Verification',
  'Disputed'
]);

/** Who holds the rights to a photograph or video. */
export const COPYRIGHT_STATUSES = Object.freeze([
  'OWNER',
  'PERMISSION_GRANTED',
  'PUBLIC_DOMAIN',
  'NOT_STATED',
  'UNKNOWN'
]);

/**
 * Build a crud.js field descriptor for one of the vocabularies above.
 *
 * Unrecognised input is rejected rather than silently corrected: quietly
 * downgrading an unknown status to "Needs Verification" would be defensible,
 * but quietly *upgrading* a typo to something stronger would not, and the
 * caller should learn which value was wrong either way.
 */
export function enumField(column, allowed, fallback) {
  return {
    column,
    transform: (value) => {
      const raw = sanitizeString(value, 60);
      if (!raw) return fallback;
      // Tolerate case and spacing differences, but nothing else.
      const match = allowed.find((a) => a.toLowerCase() === raw.toLowerCase().trim());
      return match || raw;
    },
    validate: (value) =>
      allowed.includes(value) ? null : `"${value}" is not one of: ${allowed.join(', ')}.`
  };
}

/** A year that must look like a year, or nothing at all. */
export function yearField(column) {
  return {
    column,
    transform: (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const n = Number.parseInt(value, 10);
      return Number.isInteger(n) ? n : NaN;
    },
    validate: (value) =>
      value === null || (Number.isInteger(value) && value >= 1 && value <= 2200)
        ? null
        : 'Enter a four-digit year, or leave it blank if the year is not known.'
  };
}

/**
 * An ISO date, or null.
 *
 * Blank is always allowed: an undocumented date must stay empty rather than
 * being filled with a plausible-looking guess.
 */
export function dateField(column) {
  return {
    column,
    transform: (value) => {
      const raw = sanitizeString(value, 32);
      return raw ? raw : null;
    },
    validate: (value) =>
      value === null || /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? null
        : 'Enter the date as YYYY-MM-DD, or leave it blank if it is not documented.'
  };
}

/** Only http(s) links or site-relative paths; never javascript: or data:. */
export function urlField(column, label = 'Link') {
  return {
    column,
    transform: (value) => {
      const raw = sanitizeString(value, 1000);
      if (!raw) return null;
      if (raw.startsWith('/')) return raw;
      return /^https?:\/\//i.test(raw) ? raw : NaN;
    },
    validate: (value) =>
      value === null || typeof value === 'string'
        ? null
        : `${label} must be an http(s) address or a path beginning with "/".`
  };
}

export const text = (max) => (value) => sanitizeString(value, max) || null;
export const bool = (value) => Boolean(value);
export const int = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
};
