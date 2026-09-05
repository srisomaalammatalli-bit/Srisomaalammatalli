/**
 * /api/settings — site configuration.
 *
 * GET  public — the settings a visitor's browser is allowed to see
 * PUT  admin  — update settings
 *
 * The `settings` table is a single key/value store, so the split between
 * public and private lives here rather than in the schema: only keys on the
 * PUBLIC_KEYS allow-list are ever returned to an anonymous caller. A new key
 * is therefore private by default — the safe direction to fail.
 *
 * Everything a devotee sees on the website that the committee may reasonably
 * want to change (temple name, address, contact details, QR image, receipt
 * footer, social links) is stored here rather than hard-coded in React.
 */

import { query } from '../_lib/db.js';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendMethodNotAllowed
} from '../_lib/response.js';
import { getAuthenticatedUser } from '../_lib/auth.js';
import { logAudit } from '../_lib/audit.js';
import { sanitizeString } from '../_lib/validation.js';

/**
 * Settings safe for the public website.
 *
 * Anything absent from this list is treated as private and never leaves the
 * server through the public GET.
 */
const PUBLIC_KEYS = new Set([
  // Identity
  'temple_name',
  'temple_name_telugu',
  'temple_tagline',
  'temple_tagline_telugu',
  'temple_description',
  'temple_description_telugu',
  // Deity and dedication
  'temple_deity',
  'temple_deity_telugu',
  'temple_type',
  // Location
  'temple_area',
  'temple_address_telugu',
  'temple_country',
  'temple_address',
  'temple_city',
  'temple_district',
  'temple_state',
  'temple_pincode',
  'temple_maps_url',
  'temple_latitude',
  'temple_longitude',
  // Contact
  'temple_phone',
  'temple_email',
  'temple_website',
  // Social
  'facebook_url',
  'instagram_url',
  'youtube_url',
  'whatsapp_url',
  // Timings note (per-day rows live in temple_timings)
  'timings_note',
  'timings_morning_open',
  'timings_morning_close',
  'timings_evening_open',
  'timings_evening_close',
  // Third-party listing figures (rating, review count, listed hours).
  // Public because the page shows them, but always rendered as a listing
  // rather than as temple-published fact — see PublicLayout and AboutPage.
  'listing_rating',
  'listing_review_count',
  'listing_source',
  'listing_hours_note',
  'listing_opening_time',
  // Where the opening hours came from, and whether anyone confirmed them.
  // Public because the page must be able to label the hours honestly.
  'timings_source_type',
  'timings_verified',
  // Donation and payment display
  'donation_qr_image',
  'donation_qr_provider',
  'donation_title',
  'donation_description',
  'donation_instructions',
  'donation_suggested_amounts',
  'donation_minimum_paise',
  // Receipt
  'receipt_footer',
  'receipt_registration_line',
  // SEO
  'site_title',
  'site_description',
  'site_og_image',
  // Footer
  'footer_text',
  'footer_text_telugu'
]);

/** Keys that must never be exposed or written through this route. */
const FORBIDDEN_KEYS = new Set([
  'database_url',
  'session_secret',
  'razorpay_key_secret',
  'razorpay_webhook_secret',
  'r2_secret_access_key',
  'r2_access_key_id',
  'admin_password'
]);

const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 4000;

export default async function handler(req, res) {
  try {
    /* ---------------- Public read ---------------- */
    if (req.method === 'GET') {
      const user = await getAuthenticatedUser(req).catch(() => null);

      const result = await query('SELECT key, value FROM settings');

      const settings = {};
      for (const row of result.rows) {
        // Administrators see every setting; the public sees the allow-list.
        if (user || PUBLIC_KEYS.has(row.key)) {
          if (!FORBIDDEN_KEYS.has(String(row.key).toLowerCase())) {
            let val = row.value;
            if (typeof val === 'string' && (val.startsWith('"') || val.startsWith('{') || val.startsWith('['))) {
              try {
                val = JSON.parse(val);
              } catch {}
            }
            settings[row.key] = val;
          }
        }
      }

      // CMS content must never be served stale: the committee expects a
      // change to appear on the next request.
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return sendSuccess(res, { settings });
    }

    /* ---------------- Admin write ---------------- */
    if (req.method === 'PUT' || req.method === 'POST') {
      const user = await getAuthenticatedUser(req);
      if (!user) return sendUnauthorized(res, 'Sign in to change site settings.');

      const body = req.body || {};
      // Accept either { settings: {...} } or a bare object of key/value pairs.
      const incoming = body.settings && typeof body.settings === 'object' ? body.settings : body;

      const entries = Object.entries(incoming).filter(([k]) => k !== 'settings');
      if (entries.length === 0) {
        return sendBadRequest(res, 'No settings were supplied.');
      }

      const applied = [];
      const rejected = [];

      for (const [rawKey, rawValue] of entries) {
        const key = sanitizeString(rawKey, MAX_KEY_LENGTH);

        if (!key || !/^[a-z0-9_]+$/i.test(key)) {
          rejected.push(`${rawKey}: invalid key`);
          continue;
        }
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
          // Secrets belong in environment variables, never in the database.
          rejected.push(`${key}: secrets cannot be stored as settings`);
          continue;
        }

        const value =
          rawValue === null || rawValue === undefined
            ? ''
            : sanitizeString(String(rawValue), MAX_VALUE_LENGTH);

        const jsonValue = JSON.stringify(value);

        await query(
          `INSERT INTO settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [key, jsonValue]
        );
        applied.push(key);
      }

      if (applied.length === 0) {
        return sendBadRequest(res, rejected[0] || 'No valid settings were supplied.');
      }

      await logAudit(query, {
        userId: user.id,
        userName: user.name,
        action: 'ADMIN_UPDATED_SETTINGS',
        entityType: 'Settings',
        entityId: applied.join(','),
        // Key names only — values may contain contact details.
        metadata: { keys: applied },
        req
      });

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return sendSuccess(
        res,
        { updated: applied, rejected },
        `${applied.length} setting${applied.length === 1 ? '' : 's'} saved.`
      );
    }

    return sendMethodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    console.error('[Settings Error]', err);
    if (err.message === 'DATABASE_NOT_CONFIGURED') {
      return sendError(res, 'The temple database is not available.', 'DATABASE_NOT_CONFIGURED', 503);
    }
    return sendError(res, 'Unable to process this settings request.');
  }
}

export { PUBLIC_KEYS };
