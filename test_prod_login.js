const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const networkRequests = [];
  const errors = [];

  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      console.log(`[${m.type()}]`, m.text());
    }
  });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
  page.on('request', req => {
    if (req.url().includes('insforge') || req.url().includes('auth') || req.url().includes('api')) {
      networkRequests.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('response', async resp => {
    if (resp.url().includes('insforge') || resp.url().includes('auth')) {
      console.log(`<- ${resp.status()} ${resp.url()}`);
      if (resp.status() >= 400) {
        try { console.log('  body:', (await resp.text()).substring(0, 300)); } catch {}
      }
    }
  });

  console.log('--> goto /auth/login');
  await page.goto('https://wimruxapp.vercel.app/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"]', 'admin@westago.bf');
  await page.fill('input[type="password"]', 'WestagoAdmin2026!');
  console.log('--> click submit');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(6000);

  console.log('\nFinal URL:', page.url());

  // Check what's on the page now
  const visibleText = await page.evaluate(() => document.body.innerText.substring(0, 400));
  console.log('\nVisible text:\n', visibleText);

  // Notification?
  const notify = await page.$('.q-notification');
  if (notify) console.log('\nNOTIFY:', await notify.innerText());

  console.log('\n=== requests ===');
  networkRequests.forEach(r => console.log(r));

  if (errors.length) {
    console.log('\n=== JS errors ===');
    errors.forEach(e => console.log(e));
  }

  await browser.close();
})();
