const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, 'dist');
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(DIST, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(4180, r));
  console.log('Server on http://localhost:4180');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  try {
    await page.goto('http://localhost:4180', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'playwright-home.png' });

    // Try to find Reels tab and navigate
    const reelsBtn = page.locator('text=/Reels/i').first();
    if (await reelsBtn.count()) {
      await reelsBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'playwright-reels.png' });
      console.log('REELS: navigated');
    } else {
      console.log('REELS: tab not found on screen');
    }
  } catch (e) {
    console.log('NAV ERROR: ' + e.message);
  }

  console.log('CONSOLE ERRORS:', errors.length);
  errors.slice(0, 10).forEach(e => console.log('  - ' + e));

  await browser.close();
  server.close();
})();
