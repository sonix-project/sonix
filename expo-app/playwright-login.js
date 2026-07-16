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
  await new Promise(r => server.listen(4181, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:4181', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const initialText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('INITIAL TEXT:', JSON.stringify(initialText));

  // Try login
  const emailInput = page.locator('input[type="email"], input[placeholder*="Email" i], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"]').first();
  if (await emailInput.count()) {
    console.log('LOGIN FORM found');
    await emailInput.fill('test@test.com');
    await passInput.fill('password123');
    const loginBtn = page.getByText(/تسجيل الدخول|login|sign in/i).first();
    if (await loginBtn.count()) { await loginBtn.click(); console.log('Clicked login'); }
    else { console.log('No login button text match; pressing Enter'); await passInput.press('Enter'); }
    await page.waitForTimeout(4000);
    const afterText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('AFTER LOGIN TEXT:', JSON.stringify(afterText));
    await page.screenshot({ path: 'playwright-afterlogin.png' });

    // Look for reels
    const reelsLink = page.locator('text=/reel/i').first();
    if (await reelsLink.count()) {
      await reelsLink.click();
      await page.waitForTimeout(2500);
      const reelsText = await page.evaluate(() => document.body.innerText.slice(0, 600));
      console.log('REELS TEXT:', JSON.stringify(reelsText));
      await page.screenshot({ path: 'playwright-reels.png' });
    } else {
      console.log('No reels link after login');
    }
  } else {
    console.log('No email input — already authed or different start');
    const reelsLink = page.locator('text=/reel/i').first();
    if (await reelsLink.count()) { await reelsLink.click(); await page.waitForTimeout(2000); await page.screenshot({ path: 'playwright-reels.png' }); console.log('REELS TEXT:', JSON.stringify(await page.evaluate(() => document.body.innerText.slice(0,400)))); }
  }

  console.log('CONSOLE ERRORS:', errors.length);
  errors.slice(0, 15).forEach(e => console.log('  - ' + e));
  await browser.close();
  server.close();
})();
