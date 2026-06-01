const { chromium } = require('playwright');

async function testLogin() {
  console.log('🚀 Démarrage du test de connexion avec Playwright v2...');
  
  // Lancer le navigateur
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Ralentir pour voir ce qui se passe
  });
  const page = await browser.newPage();
  
  try {
    // Naviguer vers l'application
    console.log('📍 Navigation vers https://wimruxapp.vercel.app');
    await page.goto('https://wimruxapp.vercel.app', { waitUntil: 'networkidle' });
    
    // Attendre plus longtemps que l'application Vue.js charge
    console.log('⏳ Attente du chargement de l\'application Vue.js...');
    await page.waitForTimeout(5000);
    
    // Prendre une capture d'écran
    await page.screenshot({ path: 'login_page_v2.png' });
    console.log('📸 Capture d\'écran de la page sauvegardée');
    
    // Vérifier si nous sommes sur une page de login ou landing
    const pageContent = await page.content();
    const hasLoginForm = pageContent.includes('password') || 
                       pageContent.includes('email') || 
                       pageContent.includes('connexion') ||
                       pageContent.includes('login');
    
    if (!hasLoginForm) {
      console.log('🔍 Pas de formulaire de login trouvé, recherche d\'un bouton de connexion...');
      
      // Chercher un bouton pour accéder à la page de login
      const loginButtonSelectors = [
        'button:has-text("Connexion")',
        'button:has-text("Se connecter")',
        'button:has-text("Login")',
        'a:has-text("Connexion")',
        'a:has-text("Se connecter")',
        'a:has-text("Login")',
        '.login-btn',
        '.connect-btn'
      ];
      
      for (const selector of loginButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`✅ Bouton de connexion trouvé: ${selector}`);
            await button.click();
            await page.waitForTimeout(3000);
            break;
          }
        } catch (e) {
          // Continuer
        }
      }
    }
    
    // Maintenant chercher les champs de formulaire avec plus de sélecteurs
    console.log('🔍 Recherche approfondie des champs de connexion...');
    
    // Attendre que les éléments dynamiques apparaissent
    await page.waitForTimeout(3000);
    
    // Sélecteurs plus larges pour les champs
    const emailField = await page.$('input[type="email"], input[name*="mail"], input[placeholder*="mail"], input[placeholder*="email"], .q-field input, .email input, #email');
    const passwordField = await page.$('input[type="password"], input[name*="pass"], input[placeholder*="pass"], .q-field[type="password"] input, .password input, #password');
    
    if (emailField && passwordField) {
      console.log('✅ Champs de connexion trouvés!');
      
      // Remplir les champs
      console.log('⌨️ Remplissage des identifiants...');
      await emailField.click();
      await emailField.fill('admin@westago.bf');
      
      await passwordField.click();
      await passwordField.fill('WestagoAdmin2026!');
      
      // Chercher le bouton submit
      const submitButton = await page.$('button[type="submit"], .q-btn:has-text("Connexion"), .q-btn:has-text("Se connecter"), .login-btn, .submit-btn');
      
      if (submitButton) {
        console.log('🔘 Bouton de connexion trouvé, clic en cours...');
        await submitButton.click();
        
        // Attendre la réponse
        await page.waitForTimeout(5000);
        
        // Prendre une capture d'écran
        await page.screenshot({ path: 'after_login_v2.png' });
        console.log('📸 Capture d\'écran après connexion sauvegardée');
        
        console.log('✅ Test terminé! URL actuelle:', page.url());
      } else {
        console.log('❌ Bouton de connexion non trouvé');
      }
    } else {
      console.log('❌ Champs de connexion toujours non trouvés');
      console.log('🔍 Analyse détaillée de la page...');
      
      // Lister tous les inputs sur la page
      const inputs = await page.$$('input');
      console.log(`Nombre d'inputs trouvés: ${inputs.length}`);
      
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const className = await input.getAttribute('class');
        
        console.log(`Input ${i + 1}: type=${type}, name=${name}, placeholder=${placeholder}, class=${className}`);
      }
      
      // Prendre une capture d'écran finale
      await page.screenshot({ path: 'debug_page.png' });
      console.log('📸 Capture d\'écran de debug sauvegardée');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    console.log('🔄 Le navigateur reste ouvert pour 30 secondes...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

testLogin().catch(console.error);
