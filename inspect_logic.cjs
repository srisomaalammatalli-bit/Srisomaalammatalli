const fs = require('fs');

const admLogic = fs.readFileSync('unpacked_bundle_1/admin_logic.js', 'utf8');
const pubLogic = fs.readFileSync('unpacked_bundle_2/public_logic.js', 'utf8');

console.log('=== ADMIN LOGIC ===');
console.log('Lines:', admLogic.split('\n').length);
const admStateMatch = admLogic.match(/state\s*=\s*\{([\s\S]*?)\n\s*\};/);
if (admStateMatch) {
  console.log('Admin State Keys:', admStateMatch[1].split('\n').map(l => l.trim()).filter(l => l.includes(':')).map(l => l.split(':')[0]));
}

console.log('\n=== PUBLIC LOGIC ===');
console.log('Lines:', pubLogic.split('\n').length);
const pubStateMatch = pubLogic.match(/state\s*=\s*\{([\s\S]*?)\n\s*\};/);
if (pubStateMatch) {
  console.log('Public State Keys:', pubStateMatch[1].split('\n').map(l => l.trim()).filter(l => l.includes(':')).map(l => l.split(':')[0]));
}
