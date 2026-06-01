const { chromium } = require('playwright');

async function realLogin() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  
  console.log('1. Navigation vers /auth/login');
  await page.goto('https://wimruxapp.vercel.app/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('2. Remplissage email');
  await page.fill('input[type="email"]', 'admin@westago.bf');
  
  console.log('3. Remplissage mot de passe');
  await page.fill('input[type="password"]', 'WestagoAdmin2026!');
  
  await page.screenshot({ path: 'before_submit.png' });
  
  console.log('4. Clic sur "Se connecter"');
  await page.click('button[type="submit"]');
  
  console.log('5. Attente de la réponse...');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'after_submit.png' });
  
  console.log('URL APRÈS LOGIN:', page.url());
  
  // Vérifier si on est connecté
  const isLoggedIn = !page.url().includes('/auth/login');
  console.log(isLoggedIn ? '✅ CONNECTÉ' : '❌ ÉCHEC LOGIN');
  
  // Vérifier le contenu visible
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('\nContenu visible:');
  console.log(bodyText);
  
  if (errors.length > 0) {
    console.log('\n=== ERREURS ===');
    errors.forEach(e => console.log(e));
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
}

realLogin().catch(console.error);
