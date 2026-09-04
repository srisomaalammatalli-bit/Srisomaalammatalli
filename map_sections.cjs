const fs = require('fs');

function mapSections(file, name) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n=== Sections in ${name} ===`);
  lines.forEach((line, idx) => {
    if (line.includes('<sc-if value="{{ v') || line.includes('<sc-if value="{{ is') || line.includes('<sc-if value="{{ dStep')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

mapSections('unpacked_bundle_1/admin_markup.html', 'ADMIN');
mapSections('unpacked_bundle_2/public_markup.html', 'PUBLIC');
