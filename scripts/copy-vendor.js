// Copy runtime vendor assets (Chart.js) out of node_modules into public/assets/vendor
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
const outDir = path.join(root, 'public', 'assets', 'vendor');
const out = path.join(outDir, 'chart.umd.js');

if (!fs.existsSync(src)) {
  console.error('[copy-vendor] chart.js not found — run npm install first');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);
console.log(`[copy-vendor] ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
