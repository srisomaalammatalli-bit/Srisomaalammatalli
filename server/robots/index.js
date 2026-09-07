/**
 * /api/robots or /robots.txt
 *
 * Dynamic robots.txt for Srisomaalammatalli Temple.
 * Allows public crawling of canonical content while safeguarding admin,
 * API, and private financial/payment endpoints.
 */

export default async function robotsHandler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  const content = `# Robots.txt for Srisomaalammatalli Temple
# Canonical: https://srisomaalammatalli.in

User-agent: *
Allow: /
Allow: /history
Allow: /timings
Allow: /poojas
Allow: /events
Allow: /festivals
Allow: /gallery
Allow: /videos
Allow: /contact
Allow: /donate
Allow: /assets/

# Disallow private administration, API gateway, and transaction claims
Disallow: /admin
Disallow: /admin/
Disallow: /api
Disallow: /api/
Disallow: /login
Disallow: /payment
Disallow: /payment/
Disallow: /claims
Disallow: /claims/

Sitemap: https://srisomaalammatalli.in/sitemap.xml
`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.end(content);
}
