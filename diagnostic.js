const { chromium } = require('playwright');

async function diagnostic() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const consoleMessages = [];
  
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });
  
  page.on('requestfailed', req => {
    errors.push(`REQUEST FAILED: ${req.url()} - ${req.failure().errorText}`);
  });
  
  console.log('=== TEST LANDING PAGE ===');
  await page.goto('https://wimruxapp.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  // Compter tous les éléments
  const buttonCount = await page.$$eval('button', els => els.length);
  const linkCount = await page.$$eval('a', els => els.length);
  const inputCount = await page.$$eval('input', els => els.length);
  console.log(`Buttons: ${buttonCount}, Links: ${linkCount}, Inputs: ${inputCount}`);
  
  // Lister TOUS les boutons avec leur texte
  const buttons = await page.$$eval('button', els => els.map(e => ({
    text: e.textContent.trim().substring(0, 50),
    visible: e.offsetParent !== null
  })));
  console.log('Boutons trouvés:');
  buttons.forEach((b, i) => console.log(`  ${i}: "${b.text}" visible=${b.visible}`));
  
  // Lister TOUS les liens
  const links = await page.$$eval('a', els => els.map(e => ({
    text: e.textContent.trim().substring(0, 50),
    href: e.getAttribute('href')
  })));
  console.log('Liens trouvés:');
  links.forEach((l, i) => console.log(`  ${i}: "${l.text}" -> ${l.href}`));
  
  console.log('\n=== TEST /auth/login ===');
  await page.goto('https://wimruxapp.vercel.app/auth/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  
  const inputs2 = await page.$$eval('input', els => els.map(e => ({
    type: e.type,
    name: e.name,
    placeholder: e.placeholder,
    visible: e.offsetParent !== null
  })));
  console.log('Inputs sur /auth/login:');
  inputs2.forEach((i, idx) => console.log(`  ${idx}: type=${i.type} name=${i.name} placeholder="${i.placeholder}" visible=${i.visible}`));
  
  const buttons2 = await page.$$eval('button', els => els.map(e => ({
    text: e.textContent.trim().substring(0, 50),
    type: e.type,
    visible: e.offsetParent !== null
  })));
  console.log('Boutons sur /auth/login:');
  buttons2.forEach((b, i) => console.log(`  ${i}: "${b.text}" type=${b.type} visible=${b.visible}`));
  
  console.log('\n=== ERREURS ===');
  if (errors.length === 0) console.log('Aucune erreur');
  else errors.forEach(e => console.log(e));
  
  console.log('\n=== CONSOLE MESSAGES (derniers 20) ===');
  consoleMessages.slice(-20).forEach(m => console.log(m));
  
  await browser.close();
}

diagnostic().catch(console.error);
