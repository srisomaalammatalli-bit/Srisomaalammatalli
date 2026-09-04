const fs = require('fs');

function extractParts(bundleDir, outPrefix) {
  const html = fs.readFileSync(`${bundleDir}/template_raw.html`, 'utf8');
  
  // Extract script logic
  const scriptMatch = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    fs.writeFileSync(`${bundleDir}/${outPrefix}_logic.js`, scriptMatch[1].trim());
    console.log(`Saved ${outPrefix}_logic.js (${scriptMatch[1].length} chars)`);
  }

  // Extract markup inside <x-dc> excluding the script
  const xdcMatch = html.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  if (xdcMatch) {
    let markup = xdcMatch[1];
    markup = markup.replace(/<script type="text\/x-dc"[^>]*>[\s\S]*?<\/script>/, '');
    fs.writeFileSync(`${bundleDir}/${outPrefix}_markup.html`, markup.trim());
    console.log(`Saved ${outPrefix}_markup.html (${markup.length} chars)`);
  }
}

extractParts('unpacked_bundle_1', 'admin');
extractParts('unpacked_bundle_2', 'public');
