const { chromium } = require('playwright');

async function testLoginRoute() {
  console.log('🚀 Test direct route /login...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Essayer différentes routes de login
    const routes = [
      'https://wimruxapp.vercel.app/login',
      'https://wimruxapp.vercel.app/auth/login',
      'https://wimruxapp.vercel.app/#/login',
      'https://wimruxapp.vercel.app/#!/login'
    ];
    
    for (const route of routes) {
      console.log(`📍 Test route: ${route}`);
      await page.goto(route);
      await page.waitForTimeout(3000);
      
      const title = await page.title();
      console.log(`📄 Titre: ${title}`);
      
      // Chercher n'importe quel input
      const inputs = await page.$$('input');
      console.log(`📝 Nombre d'inputs: ${inputs.length}`);
      
      if (inputs.length > 0) {
        console.log('✅ Inputs trouvés sur cette route!');
        
        // Prendre une capture
        await page.screenshot({ path: `login_route_${routes.indexOf(route)}.png` });
        
        // Essayer de remplir
        const emailInput = await page.$('input[type="email"], input[name*="mail"]');
        const passwordInput = await page.$('input[type="password"]');
        
        if (emailInput && passwordInput) {
          console.log('✅ Champs email/password trouvés!');
          await emailInput.fill('admin@westago.bf');
          await passwordInput.fill('WestagoAdmin2026!');
          
          const submitBtn = await page.$('button[type="submit"], button:has-text("Connexion"), button:has-text("Login")');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
            console.log('🎉 CONNEXION RÉUSSIE! URL finale:', page.url());
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginRoute();
