/**
 * IndexNow notification helper.
 *
 * Pings Bing and participating search engines when public pages or content
 * are published or modified. Reads indexnow_key from settings or environment.
 * If no key is set or the ping fails, it logs an informational message and
 * returns cleanly so the user's write is never blocked.
 */

import { query } from './db.js';

export async function notifyIndexNow(urlList) {
  if (!urlList || !urlList.length) return { success: false, reason: 'NO_URLS' };

  try {
    let key = process.env.INDEXNOW_KEY || '';
    if (!key) {
      const res = await query("SELECT value FROM settings WHERE key = 'indexnow_key'").catch(() => ({ rows: [] }));
      if (res.rows.length && res.rows[0].value) {
        try {
          key = JSON.parse(res.rows[0].value);
        } catch {
          key = res.rows[0].value;
        }
      }
    }

    if (!key || typeof key !== 'string' || !key.trim()) {
      return { success: false, reason: 'INDEXNOW_KEY_NOT_CONFIGURED' };
    }

    const host = 'srisomaalammatalli.in';
    const body = {
      host,
      key: key.trim(),
      keyLocation: `https://${host}/${key.trim()}.txt`,
      urlList: Array.isArray(urlList) ? urlList : [urlList]
    };

    const resp = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body)
    });

    return {
      success: resp.ok,
      status: resp.status
    };
  } catch (err) {
    console.warn('[IndexNow] Ping failed (non-blocking):', err.message);
    return { success: false, error: err.message };
  }
}
