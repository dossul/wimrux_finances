const { chromium } = require('playwright');

async function testSimple() {
  console.log('🚀 Test simple après rebuild...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://wimruxapp.vercel.app');
    await page.waitForTimeout(3000);
    
    // Vérifier que la page charge
    const title = await page.title();
    console.log('📄 Titre de la page:', title);
    
    // Prendre une capture
    await page.screenshot({ path: 'test_simple.png' });
    console.log('📸 Capture sauvegardée: test_simple.png');
    
    // Chercher le bouton CONNEXION
    const connexionBtn = await page.$('button:has-text("CONNEXION")');
    if (connexionBtn) {
      console.log('✅ Bouton CONNEXION trouvé!');
      await connexionBtn.click();
      await page.waitForTimeout(2000);
      
      // Chercher les champs de login
      const emailField = await page.$('input[type="email"]');
      const passwordField = await page.$('input[type="password"]');
      
      if (emailField && passwordField) {
        console.log('✅ Champs de login trouvés!');
        await emailField.fill('admin@westago.bf');
        await passwordField.fill('WestagoAdmin2026!');
        
        const submitBtn = await page.$('button[type="submit"], button:has-text("Se connecter")');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          console.log('🎉 CONNEXION RÉUSSIE! URL:', page.url());
        }
      }
    } else {
      console.log('❌ Bouton CONNEXION non trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testSimple();
