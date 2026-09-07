/**
 * /api/sitemap or /sitemap.xml
 *
 * Dynamic XML sitemap for Srisomaalammatalli Temple.
 * Queries live database for published poojas, events, festivals, and public pages.
 * Emits real ISO 8601 lastmod timestamps from updated_at / created_at columns.
 * Excludes private administrative, authentication, accounting, and transaction paths.
 */

import { query } from '../_lib/db.js';

const DOMAIN = 'https://srisomaalammatalli.in';

function formatIsoDate(dateVal) {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function sitemapHandler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    const urls = [];

    // 1. Core static pages with approximate last update or current release date
    const staticPages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/history', changefreq: 'monthly', priority: '0.9' },
      { loc: '/timings', changefreq: 'monthly', priority: '0.9' },
      { loc: '/poojas', changefreq: 'weekly', priority: '0.9' },
      { loc: '/events', changefreq: 'weekly', priority: '0.8' },
      { loc: '/festivals', changefreq: 'weekly', priority: '0.8' },
      { loc: '/gallery', changefreq: 'weekly', priority: '0.7' },
      { loc: '/videos', changefreq: 'weekly', priority: '0.7' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.8' },
      { loc: '/donate', changefreq: 'monthly', priority: '0.8' }
    ];

    for (const p of staticPages) {
      urls.push({
        loc: `${DOMAIN}${p.loc}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: p.changefreq,
        priority: p.priority
      });
    }

    // 2. Published Poojas
    try {
      const poojas = await query(
        "SELECT slug, updated_at, created_at FROM poojas WHERE published = TRUE AND slug IS NOT NULL AND slug != ''"
      );
      for (const row of poojas.rows) {
        urls.push({
          loc: `${DOMAIN}/poojas/${escapeXml(row.slug)}`,
          lastmod: formatIsoDate(row.updated_at || row.created_at),
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    } catch (e) {
      console.warn('[Sitemap] Could not load poojas for sitemap:', e.message);
    }

    // 3. Published Events
    try {
      const events = await query(
        "SELECT slug, updated_at, created_at FROM events WHERE published = TRUE AND slug IS NOT NULL AND slug != ''"
      );
      for (const row of events.rows) {
        urls.push({
          loc: `${DOMAIN}/events/${escapeXml(row.slug)}`,
          lastmod: formatIsoDate(row.updated_at || row.created_at),
          changefreq: 'weekly',
          priority: '0.7'
        });
      }
    } catch (e) {
      console.warn('[Sitemap] Could not load events for sitemap:', e.message);
    }

    // 4. Published Festivals
    try {
      const festivals = await query(
        "SELECT slug, updated_at, created_at FROM temple_festivals WHERE published = TRUE AND slug IS NOT NULL AND slug != ''"
      );
      for (const row of festivals.rows) {
        urls.push({
          loc: `${DOMAIN}/festivals/${escapeXml(row.slug)}`,
          lastmod: formatIsoDate(row.updated_at || row.created_at),
          changefreq: 'monthly',
          priority: '0.8'
        });
      }
    } catch (e) {
      console.warn('[Sitemap] Could not load festivals for sitemap:', e.message);
    }

    // Generate XML
    const xmlItems = urls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.end(xml);
  } catch (err) {
    console.error('[Sitemap Error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Error generating sitemap');
  }
}
