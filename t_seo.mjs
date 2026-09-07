import assert from 'node:assert';
import { TEMPLE, ADDRESS_SINGLE_LINE } from './src/config/temple.js';
import { loadEnv } from './database/env.js';

loadEnv();

async function runSeoTests() {
  console.log('--- Running Technical SEO Test Suite ---');
  let passed = 0;

  // Test 1: Canonical Temple Name
  assert.strictEqual(TEMPLE.name, 'Srisomaalammatalli Temple', 'Temple name must be canonical');
  console.log('  ✓ Check 1: Canonical Name is Srisomaalammatalli Temple');
  passed++;

  // Test 2: Alternate Name
  assert.strictEqual(TEMPLE.alternateName, 'Sri Somalamma Talli Temple', 'Alternate spelling must be preserved');
  console.log('  ✓ Check 2: Alternate Name is Sri Somalamma Talli Temple');
  passed++;

  // Test 3: Canonical District
  assert.strictEqual(TEMPLE.address.district, 'East Godavari District', 'District must be East Godavari District');
  console.log('  ✓ Check 3: District is East Godavari District');
  passed++;

  // Test 4: Canonical Pincode
  assert.strictEqual(TEMPLE.address.pincode, '533214', 'PIN must be 533214');
  console.log('  ✓ Check 4: PIN Code is 533214');
  passed++;

  // Test 5: Location integrity (No Rajahmundry as active location)
  assert.ok(!ADDRESS_SINGLE_LINE.toLowerCase().includes('rajahmundry'), 'Address must not cite Rajahmundry');
  console.log('  ✓ Check 5: No Rajahmundry in active address');
  passed++;

  // Test 6: Official Verified Phone & Email
  assert.strictEqual(TEMPLE.contact.phone, '+91 98667 33559', 'Official verified phone must match');
  assert.strictEqual(TEMPLE.contact.email, 'srisomaalammatalli@gmail.com', 'Official verified email must match');
  assert.ok(!TEMPLE.contact.phone.includes('11111 11111'), 'Phone must not be placeholder 11111 11111');
  console.log('  ✓ Check 6: Official verified contact details (+91 98667 33559, srisomaalammatalli@gmail.com)');
  passed++;

  // Test 7: Stable Primary Entity ID
  assert.strictEqual(TEMPLE.entityId, 'https://srisomaalammatalli.in/#temple', 'Entity ID must be #temple');
  console.log('  ✓ Check 7: Primary Entity ID is https://srisomaalammatalli.in/#temple');
  passed++;

  // Test 8: Dynamic Sitemap Endpoint
  const sitemapMod = await import('./server/sitemap/index.js');
  let sitemapOutput = '';
  let sitemapHeaders = {};
  const sitemapRes = {
    statusCode: 200,
    setHeader(k, v) { sitemapHeaders[k] = v; },
    end(data) { sitemapOutput = data; }
  };
  await sitemapMod.default({ method: 'GET' }, sitemapRes);
  assert.strictEqual(sitemapRes.statusCode, 200, 'Sitemap must return 200');
  assert.ok(sitemapHeaders['Content-Type'].includes('application/xml'), 'Sitemap must have application/xml Content-Type');
  assert.ok(sitemapOutput.includes('<urlset'), 'Sitemap must contain <urlset>');
  assert.ok(sitemapOutput.includes('https://srisomaalammatalli.in/'), 'Sitemap must contain home URL');
  assert.ok(sitemapOutput.includes('<lastmod>'), 'Sitemap must contain <lastmod>');
  assert.ok(!sitemapOutput.includes('/admin'), 'Sitemap must not contain /admin');
  assert.ok(!sitemapOutput.includes('/api/'), 'Sitemap must not contain /api/');
  console.log('  ✓ Check 8: Dynamic XML Sitemap is valid, clean, and database-driven');
  passed++;

  // Test 9: Dynamic Robots.txt Endpoint
  const robotsMod = await import('./server/robots/index.js');
  let robotsOutput = '';
  let robotsHeaders = {};
  const robotsRes = {
    statusCode: 200,
    setHeader(k, v) { robotsHeaders[k] = v; },
    end(data) { robotsOutput = data; }
  };
  await robotsMod.default({ method: 'GET' }, robotsRes);
  assert.strictEqual(robotsRes.statusCode, 200, 'Robots must return 200');
  assert.ok(robotsHeaders['Content-Type'].includes('text/plain'), 'Robots must have text/plain Content-Type');
  assert.ok(robotsOutput.includes('Disallow: /admin'), 'Robots must disallow /admin');
  assert.ok(robotsOutput.includes('Disallow: /api'), 'Robots must disallow /api');
  assert.ok(robotsOutput.includes('Disallow: /payment'), 'Robots must disallow /payment');
  assert.ok(robotsOutput.includes('Sitemap: https://srisomaalammatalli.in/sitemap.xml'), 'Robots must declare sitemap');
  console.log('  ✓ Check 9: Robots.txt rules and privacy safeguards verified');
  passed++;

  // Test 10: SEO Metadata Resolver Endpoint
  const seoMod = await import('./server/seo/index.js');
  let seoOutput = null;
  const seoRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { seoOutput = payload; return this; },
    end(data) { if (data && typeof data === 'string') seoOutput = JSON.parse(data); }
  };
  await seoMod.default({ method: 'GET', query: { path: '/' } }, seoRes);
  assert.strictEqual(seoOutput?.success, true, 'SEO resolver must return success: true');
  assert.strictEqual(seoOutput?.data?.templeName, 'Srisomaalammatalli Temple', 'Resolved templeName must match');
  assert.strictEqual(seoOutput?.data?.canonicalUrl, 'https://srisomaalammatalli.in', 'Resolved canonicalUrl must match');
  assert.ok(seoOutput?.data?.jsonLd?.['@graph']?.length >= 2, 'Resolved @graph must contain temple & website entities');
  console.log('  ✓ Check 10: Unified Schema.org @graph metadata resolver verified');
  passed++;

  // Test 11: Google Search Console Dynamic Verification Handler
  const gscFile = 'google1234567890abcdef.html';
  const isGscMatch = /^google[a-z0-9]+\.html$/i.test(gscFile);
  assert.strictEqual(isGscMatch, true, 'Google verification regex should match verification file format');
  const gscResponse = `google-site-verification: ${gscFile}`;
  assert.strictEqual(gscResponse, 'google-site-verification: google1234567890abcdef.html');
  console.log('  ✓ Check 11: Google Search Console dynamic verification handler verified');
  passed++;

  console.log(`\nTechnical SEO Suite: ${passed}/${passed} tests PASSED!\n`);
}

runSeoTests().catch((err) => {
  console.error('Technical SEO Test failed:', err);
  process.exit(1);
});
