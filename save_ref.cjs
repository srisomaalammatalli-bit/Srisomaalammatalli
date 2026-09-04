const fs = require('fs');
const path = require('path');

// Extract sections from admin_markup.html
const adminHtml = fs.readFileSync('unpacked_bundle_1/admin_markup.html', 'utf8');
const publicHtml = fs.readFileSync('unpacked_bundle_2/public_markup.html', 'utf8');

const refDir = 'scratch/ref';
if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });

// Save complete markup for reference
fs.writeFileSync(path.join(refDir, 'admin_full.html'), adminHtml);
fs.writeFileSync(path.join(refDir, 'public_full.html'), publicHtml);

console.log('Saved admin_full.html and public_full.html to scratch/ref');
