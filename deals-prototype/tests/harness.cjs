let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
// Serve the Vercel-hosted DS from a local clone (offline / sandboxed runs).
const DS = process.env.GOCANOPY_DS_ROOT || path.resolve(__dirname, '../../../gocanopy-design-system');
const BASE = process.env.BASE_URL || 'http://localhost:8080/';
async function setup(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 880 }, deviceScaleFactor: opts.dpr || 1 });
  await ctx.route(/gocanopy-design-system\.vercel\.app\/(.*)/, (route) => {
    const p = new URL(route.request().url()).pathname;
    const f = path.join(DS, p);
    const type = p.endsWith('.css') ? 'text/css' : 'application/javascript';
    route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(f) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  return { browser, page, errors };
}
module.exports = { setup };
