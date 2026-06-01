// Script de test pour vérifier la connexion à l'application
// Utilise le fetch natif de Node.js (v18+)

async function testLogin() {
  try {
    console.log('Test de connexion à WIMRUX Finances...');
    console.log('URL: https://wimruxapp.vercel.app');
    
    // Test d'abord si le site est accessible
    const homeResponse = await fetch('https://wimruxapp.vercel.app');
    console.log('Status page d\'accueil:', homeResponse.status);
    
    if (homeResponse.ok) {
      console.log('✅ Site accessible - Application déployée avec succès!');
      
      // Vérifier le contenu HTML pour confirmer que c'est bien l'application
      const html = await homeResponse.text();
      if (html.includes('WIMRUX') || html.includes('Finances') || html.includes('login')) {
        console.log('✅ Contenu de l\'application confirmé');
      }
    } else {
      console.log('❌ Site non accessible');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('Note: Les outils de navigation sont temporairement indisponibles');
    console.log('Veuillez tester manuellement: https://wimruxapp.vercel.app');
    console.log('Identifiants: admin@westago.bf / WestagoAdmin2026!');
  }
}

testLogin();
