const fs = require('fs');

function inspect(bundleDir, markupFile, name) {
  const content = fs.readFileSync(`${bundleDir}/${markupFile}`, 'utf8');
  console.log(`\n================== ${name} ==================`);
  console.log(`Length: ${content.length} chars`);

  // Find all sc-if blocks
  const ifRegex = /<sc-if\s+bind="([^"]+)">/g;
  let match;
  const binds = [];
  while ((match = ifRegex.exec(content)) !== null) {
    binds.push(match[1]);
  }
  console.log('sc-if binds:', binds);

  // Find all sc-for blocks
  const forRegex = /<sc-for\s+bind="([^"]+)">/g;
  const forBinds = [];
  while ((match = forRegex.exec(content)) !== null) {
    forBinds.push(match[1]);
  }
  console.log('sc-for binds:', forBinds);
}

inspect('unpacked_bundle_1', 'admin_markup.html', 'ADMIN PORTAL');
inspect('unpacked_bundle_2', 'public_markup.html', 'PUBLIC DEVOTEE SITE');
