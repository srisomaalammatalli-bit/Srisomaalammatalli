import assert from 'node:assert';
import { TEMPLE } from './src/config/temple.js';
import { loadEnv } from './database/env.js';

loadEnv();

async function runGeoTests() {
  console.log('--- Running Generative Engine Optimization (GEO) Test Suite ---');
  let passed = 0;

  // Test 1: Grounded Entity Name & Multilingual Support
  assert.strictEqual(TEMPLE.name, 'Srisomaalammatalli Temple');
  assert.strictEqual(TEMPLE.alternateName, 'Sri Somalamma Talli Temple');
  assert.strictEqual(TEMPLE.nameTelugu, 'శ్రీ సోమాలమ్మ తల్లి దేవాలయం');
  console.log('  ✓ Check 1: Multilingual entity naming (English canonical, alternate, and Telugu)');
  passed++;

  // Test 2: Grounded Darshan Timings
  assert.strictEqual(TEMPLE.timings.morning.open, '06:30');
  assert.strictEqual(TEMPLE.timings.morning.close, '11:30');
  assert.strictEqual(TEMPLE.timings.evening.open, '16:30');
  assert.strictEqual(TEMPLE.timings.evening.close, '20:25');
  console.log('  ✓ Check 2: Grounded, verified darshan hours verified');
  passed++;

  // Test 3: Grounded Geographic Hierarchy
  assert.strictEqual(TEMPLE.address.line1, 'Mungandapalem, Munjavarapu Kottu');
  assert.strictEqual(TEMPLE.address.district, 'East Godavari District');
  assert.strictEqual(TEMPLE.address.state, 'Andhra Pradesh');
  assert.strictEqual(TEMPLE.address.country, 'India');
  assert.strictEqual(TEMPLE.address.pincode, '533214');
  console.log('  ✓ Check 3: Geographic entity hierarchy (Village -> Mandal -> District -> State -> PIN)');
  passed++;

  // Test 4: Schema.org Knowledge Graph grounding
  const seoMod = await import('./server/seo/index.js');
  let seoOutput = null;
  const createMockRes = (onJson) => ({
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { onJson(payload); return this; },
    end(data) { if (data && typeof data === 'string') onJson(JSON.parse(data)); }
  });

  const seoRes = createMockRes((p) => { seoOutput = p; });
  await seoMod.default({ method: 'GET', query: { path: '/timings' } }, seoRes);
  const graph = seoOutput?.data?.jsonLd?.['@graph'] || [];
  const templeNode = graph.find((n) => n['@type'] === 'HinduTemple');
  assert.ok(templeNode, 'HinduTemple entity must exist in knowledge graph');
  assert.strictEqual(templeNode['@id'], 'https://srisomaalammatalli.in/#temple');
  assert.ok(templeNode.openingHoursSpecification.length === 2, 'Must provide verified morning and evening opening specs');
  console.log('  ✓ Check 4: Knowledge Graph node references stable #temple with verified opening specifications');
  passed++;

  // Test 5: Service offer grounding for poojas
  let poojaSeoOutput = null;
  const poojaSeoRes = createMockRes((p) => { poojaSeoOutput = p; });
  await seoMod.default({ method: 'GET', query: { path: '/poojas/abhishekam' } }, poojaSeoRes);
  const poojaGraph = poojaSeoOutput?.data?.jsonLd?.['@graph'] || [];
  const serviceNode = poojaGraph.find((n) => n['@type'] === 'Service');
  assert.ok(serviceNode, 'Service node must be generated for published poojas');
  assert.strictEqual(serviceNode.provider['@id'], 'https://srisomaalammatalli.in/#temple');
  console.log('  ✓ Check 5: Service offerings properly cite provider #temple');
  passed++;

  console.log(`\nGEO Test Suite: ${passed}/${passed} tests PASSED!\n`);
}

runGeoTests().catch((err) => {
  console.error('GEO Test failed:', err);
  process.exit(1);
});
