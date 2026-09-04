import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient.js';

/**
 * Site settings, read from the database through /api/settings.
 *
 * Everything the committee can edit — temple name, address, contact details,
 * donation instructions, the QR image, receipt footer — lives in the settings
 * table rather than in these components, so changing it needs no deployment.
 *
 * A small module-level cache keeps repeated mounts from refetching within the
 * same page view, but it is deliberately short-lived and can be cleared
 * outright: an administrator who saves a change expects the next page load to
 * show it, and correctness matters more here than saving a request.
 */

let cache = null;
let cacheAt = 0;
let inFlight = null;

/** How long a fetched copy may be reused within one browsing session. */
const MAX_AGE_MS = 15_000;

/** Discard the cached copy — called after an admin save. */
export function invalidateSettings() {
  cache = null;
  cacheAt = 0;
}

async function fetchSettings(force = false) {
  const fresh = cache && Date.now() - cacheAt < MAX_AGE_MS;
  if (fresh && !force) return cache;

  // Collapse concurrent callers into one request.
  if (inFlight) return inFlight;

  inFlight = apiClient
    .get('/settings')
    .then((data) => {
      cache = data?.settings || {};
      cacheAt = Date.now();
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * @returns {{settings: object, loading: boolean, error: boolean, reload: Function}}
 */
export function useSettings() {
  const [settings, setSettings] = useState(cache || {});
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchSettings(force);
      setSettings(data || {});
    } catch {
      setError(true);
      // Keep whatever was already shown rather than blanking the page.
      setSettings((current) => current || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, error, reload: () => load(true) };
}

/**
 * Read one setting with an optional fallback.
 * Returns '' rather than a made-up value when the committee has not set it,
 * so the interface can show an honest empty state.
 */
export function settingValue(settings, key, fallback = '') {
  const value = settings?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

/**
 * Build the temple's postal address from its parts, skipping empty ones.
 *
 * `temple_address` may already be a complete one-line address, so a part is
 * only appended when it is not already contained in what has been assembled.
 * Otherwise the city and state appear twice.
 */
export function composeAddress(settings) {
  const parts = [
    settings?.temple_address,
    settings?.temple_city,
    settings?.temple_district,
    settings?.temple_state,
    settings?.temple_pincode
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  const out = [];
  for (const part of parts) {
    const alreadyPresent = out.some((existing) =>
      existing.toLowerCase().includes(part.toLowerCase())
    );
    if (!alreadyPresent) out.push(part);
  }
  return out.join(', ');
}

/** "06:30" -> "6:30 AM". Returns '' for anything unparseable. */
export function formatClock(hhmm) {
  const value = String(hhmm || '').trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) return '';
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** "6:30 AM – 11:30 AM" from two HH:MM values. */
export function formatClockRange(open, close) {
  const a = formatClock(open);
  const b = formatClock(close);
  return a && b ? `${a} – ${b}` : '';
}

export default useSettings;
