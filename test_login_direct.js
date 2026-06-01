const { chromium } = require('playwright');

async function testLoginDirect() {
  console.log('🚀 Test DIRECT - Pas d attente inutile');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Aller directement à la page
    await page.goto('https://wimruxapp.vercel.app');
    
    // Attendre 2 secondes max
    await page.waitForTimeout(2000);
    
    // Cliquer sur le bouton CONNEXION visible sur la capture
    const connexionButton = await page.$('button:has-text("CONNEXION")');
    if (connexionButton) {
      console.log('✅ Bouton CONNEXION trouvé');
      await connexionButton.click();
      await page.waitForTimeout(2000);
      
      // Remplir les champs QUASAR (ce sont des inputs dans des .q-field)
      const emailInput = await page.$('.q-field input[type="email"], .q-field input[placeholder*="email"]');
      const passwordInput = await page.$('.q-field input[type="password"], .q-field input[placeholder*="mot de passe"]');
      
      if (emailInput && passwordInput) {
        console.log('✅ Champs trouvés');
        await emailInput.fill('admin@westago.bf');
        await passwordInput.fill('WestagoAdmin2026!');
        
        // Cliquer sur le bouton de connexion
        const submitBtn = await page.$('.q-btn:has-text("Se connecter"), .q-btn:has-text("Connexion")');
        if (submitBtn) {
          await submitBtn.click();
          console.log('✅ Connexion en cours...');
          await page.waitForTimeout(3000);
          console.log('🎉 TERMINÉ! URL:', page.url());
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginDirect();
