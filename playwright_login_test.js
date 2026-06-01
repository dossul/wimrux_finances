const { chromium } = require('playwright');

async function testLogin() {
  console.log('🚀 Démarrage du test de connexion avec Playwright...');
  
  // Lancer le navigateur
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Naviguer vers l'application
    console.log('📍 Navigation vers https://wimruxapp.vercel.app');
    await page.goto('https://wimruxapp.vercel.app');
    
    // Attendre que la page charge
    await page.waitForLoadState('networkidle');
    
    // Prendre une capture d'écran
    await page.screenshot({ path: 'login_page.png' });
    console.log('📸 Capture d\'écran de la page de login sauvegardée');
    
    // Chercher les champs de formulaire
    console.log('🔍 Recherche des champs de connexion...');
    
    // Essayer différents sélecteurs pour l'email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="mail" i]',
      '#email',
      '.email input'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.waitForSelector(selector, { timeout: 2000 });
        if (emailField) {
          console.log(`✅ Champ email trouvé avec: ${selector}`);
          break;
        }
      } catch (e) {
        // Continuer avec le sélecteur suivant
      }
    }
    
    // Essayer différents sélecteurs pour le mot de passe
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="mot de passe" i]',
      'input[placeholder*="password" i]',
      '#password',
      '.password input'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await page.waitForSelector(selector, { timeout: 2000 });
        if (passwordField) {
          console.log(`✅ Champ mot de passe trouvé avec: ${selector}`);
          break;
        }
      } catch (e) {
        // Continuer avec le sélecteur suivant
      }
    }
    
    if (!emailField || !passwordField) {
      console.log('❌ Champs de connexion non trouvés, analyse du contenu...');
      const content = await page.content();
      console.log('Contenu de la page (premiers 1000 caractères):');
      console.log(content.substring(0, 1000));
    } else {
      // Remplir les champs
      console.log('⌨️ Remplissage des identifiants...');
      await emailField.fill('admin@westago.bf');
      await passwordField.fill('WestagoAdmin2026!');
      
      // Chercher le bouton de connexion
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Connexion")',
        'button:has-text("Se connecter")',
        'button:has-text("Login")',
        '.btn-primary',
        '.login-button'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.waitForSelector(selector, { timeout: 2000 });
          if (submitButton) {
            console.log(`✅ Bouton de connexion trouvé avec: ${selector}`);
            break;
          }
        } catch (e) {
          // Continuer avec le sélecteur suivant
        }
      }
      
      if (submitButton) {
        console.log('🔘 Clic sur le bouton de connexion...');
        await submitButton.click();
        
        // Attendre la redirection
        await page.waitForLoadState('networkidle');
        
        // Prendre une capture d'écran après connexion
        await page.screenshot({ path: 'after_login.png' });
        console.log('📸 Capture d\'écran après connexion sauvegardée');
        
        console.log('✅ Test de connexion terminé!');
        console.log('🌐 URL actuelle:', page.url());
      } else {
        console.log('❌ Bouton de connexion non trouvé');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    // Garder le navigateur ouvert pour inspection
    console.log('🔄 Le navigateur reste ouvert pour inspection...');
    console.log('Appuyez sur Ctrl+C pour fermer');
    
    // Attendre avant de fermer
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    await browser.close();
  }
}

testLogin().catch(console.error);
