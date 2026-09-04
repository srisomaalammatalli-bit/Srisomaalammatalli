const fs = require('fs');

function analyzeTemplate(dir, name) {
  const content = fs.readFileSync(dir + '/template_raw.html', 'utf8');
  console.log('*** ' + name + ' ***');
  
  // Extract all <style> blocks
  const styles = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  console.log('Total <style> blocks:', styles.length);
  styles.forEach((st, i) => {
    console.log(`Style ${i}: length ${st.length}, preview: ${st.slice(0, 120).replace(/\s+/g, ' ')}`);
  });

  // Extract <script> blocks
  const scripts = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  console.log('Total <script> blocks:', scripts.length);
  scripts.forEach((sc, i) => {
    console.log(`Script ${i}: length ${sc.length}, preview: ${sc.slice(0, 120).replace(/\s+/g, ' ')}`);
  });

  // Extract unique tag names
  const tags = content.match(/<([a-z0-9-]+)[^>]*>/gi) || [];
  const tagNames = new Set(tags.map(t => t.match(/<([a-z0-9-]+)/i)[1].toLowerCase()));
  console.log('Unique tag names:', Array.from(tagNames).join(', '));
}

analyzeTemplate('unpacked_bundle_1', 'BUNDLE 1 (ADMIN)');
analyzeTemplate('unpacked_bundle_2', 'BUNDLE 2 (PUBLIC)');
