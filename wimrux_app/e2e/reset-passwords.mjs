/**
 * Reset des mots de passe via connexion directe PostgreSQL
 * Nécessite: npm install pg
 */
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:290c65e488556b72e1136ce0c6278319@gfe4bd9y.eu-central.database.insforge.app:5432/insforge?sslmode=require',
});

const EMAILS = [
  'admin@wimrux.app',
  'test1@wimrux.app',
  'test2@wimrux.app',
  'ulrich@iltic.com',
];

async function main() {
  console.log('============================================================');
  console.log('  WIMRUX® — Reset mots de passe → WimruxAdmin2026!');
  console.log('============================================================');

  await client.connect();
  console.log('✅ Connecté à PostgreSQL InsForge\n');

  for (const email of EMAILS) {
    const res = await client.query(
      `UPDATE auth.users
       SET password  = crypt('WimruxAdmin2026!', gen_salt('bf', 10)),
           updated_at = NOW()
       WHERE email = $1
       RETURNING email`,
      [email]
    );

    if (res.rowCount > 0) {
      console.log(`✅ ${email} → mot de passe mis à jour`);
    } else {
      console.log(`⚠️  ${email} → compte introuvable dans auth.users`);
    }
  }

  // Vérification finale
  console.log('\n📋 État final :');
  const check = await client.query(
    `SELECT email,
            LEFT(password, 7) AS hash_prefix,
            updated_at
     FROM auth.users
     WHERE email = ANY($1::text[])
     ORDER BY email`,
    [EMAILS]
  );

  check.rows.forEach(r => {
    console.log(`  ${r.email.padEnd(25)} hash=${r.hash_prefix}... updated=${r.updated_at}`);
  });

  await client.end();
  console.log('\n✅ Tous les mots de passe ont été réinitialisés à WimruxAdmin2026!');
}

main().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
