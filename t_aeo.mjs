import assert from 'node:assert';
import fs from 'node:fs';

async function runAeoTests() {
  console.log('--- Running Answer Engine Optimization (AEO) Test Suite ---');
  let passed = 0;

  // Test 1: AiAnswerBlock Component exists and has Question as <h2>
  const answerBlockCode = fs.readFileSync('./src/components/AiAnswerBlock.jsx', 'utf8');
  assert.ok(answerBlockCode.includes('<h2 className="ai-answer-question">{question}</h2>'), 'Question must be formatted as <h2>');
  assert.ok(answerBlockCode.includes('aria-label="Quick Answer"'), 'Section must have aria-label for accessibility');
  assert.ok(answerBlockCode.includes('ai-facts-table'), 'Facts table must be present for machine-readability');
  console.log('  ✓ Check 1: AiAnswerBlock formats question as semantic <h2> with facts table');
  passed++;

  // Test 2: HomePage includes visible direct answer block
  const homeCode = fs.readFileSync('./src/pages/public/HomePage.jsx', 'utf8');
  assert.ok(homeCode.includes('<AiAnswerBlock'), 'HomePage must include AiAnswerBlock');
  assert.ok(homeCode.includes('Where is'), 'HomePage question must ask about location and timings');
  console.log('  ✓ Check 2: HomePage embeds visible direct answer block');
  passed++;

  // Test 3: ContactPage includes visible direct answer block
  const contactCode = fs.readFileSync('./src/pages/public/ContactPage.jsx', 'utf8');
  assert.ok(contactCode.includes('<AiAnswerBlock'), 'ContactPage must include AiAnswerBlock');
  assert.ok(contactCode.includes('How do I reach'), 'ContactPage question must address how to reach');
  console.log('  ✓ Check 3: ContactPage embeds visible direct answer block');
  passed++;

  // Test 4: HistoryPage includes visible direct answer block
  const historyCode = fs.readFileSync('./src/pages/public/HistoryPage.jsx', 'utf8');
  assert.ok(historyCode.includes('<AiAnswerBlock'), 'HistoryPage must include AiAnswerBlock');
  assert.ok(historyCode.includes('What is the sacred history'), 'HistoryPage question must address sthala puranam');
  console.log('  ✓ Check 4: HistoryPage embeds visible direct answer block');
  passed++;

  // Test 5: Breadcrumb component exists with microdata BreadcrumbList
  const breadcrumbCode = fs.readFileSync('./src/components/Breadcrumb.jsx', 'utf8');
  assert.ok(breadcrumbCode.includes('itemType="https://schema.org/BreadcrumbList"'), 'Breadcrumb must declare BreadcrumbList schema');
  assert.ok(breadcrumbCode.includes('itemType="https://schema.org/ListItem"'), 'Breadcrumb items must declare ListItem schema');
  console.log('  ✓ Check 5: Breadcrumb navigation conforms to schema.org/BreadcrumbList');
  passed++;

  // Test 6: Detail pages provide deep internal links
  const poojaDetailCode = fs.readFileSync('./src/pages/public/PoojaDetailPage.jsx', 'utf8');
  assert.ok(poojaDetailCode.includes('<AiAnswerBlock'), 'PoojaDetailPage must include AiAnswerBlock');
  assert.ok(poojaDetailCode.includes('relatedLinks='), 'PoojaDetailPage must provide related internal links');
  console.log('  ✓ Check 6: PoojaDetailPage includes AEO direct answer and deep links');
  passed++;

  console.log(`\nAEO Test Suite: ${passed}/${passed} tests PASSED!\n`);
}

runAeoTests().catch((err) => {
  console.error('AEO Test failed:', err);
  process.exit(1);
});
