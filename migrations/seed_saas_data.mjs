// ============================================================================
// Seed réaliste pour les 3 entreprises SaaS — WIMRUX FINANCES
// ============================================================================
const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function q(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  const data = await r.json();
  if (r.status >= 400) throw new Error(`SQL Error: ${JSON.stringify(data)}`);
  return data.rows;
}

// Company IDs
const ILTIC       = '4a104167-b2fd-475a-9d40-c0be906cde11';
const WESTAGO     = '445329bd-a896-477a-9c32-836d1d17f5de';
const WIMRUX_SAAS = 'b05de79e-4326-40f5-81ed-643e3c8a1117';

const queries = [

  // =========================================================================
  // CLIENTS pour ILTIC (Société IT — développement web, intégration)
  // =========================================================================
  `INSERT INTO clients (company_id, type, name, ifu, rccm, address, phone, email, is_active) VALUES
    ('${ILTIC}', 'PM', 'Mairie de Ouagadougou',    '00045230A', 'N/A',                  'Av. de la Nation, Ouagadougou',        '+226 25 30 60 00', 'contact@mairie-ouaga.bf',   true),
    ('${ILTIC}', 'PM', 'ONATEL SA',                '00012345B', 'BF OUA 1995 B 01234',  'Av. de la Liberté, Ouagadougou',       '+226 25 33 40 01', 'info@onatel.bf',            true),
    ('${ILTIC}', 'PM', 'Coris Bank International',  '00078901C', 'BF OUA 2008 B 07890',  '476 Av. Dimdolobsom, Ouagadougou',     '+226 25 31 45 60', 'contact@corisbank.bf',      true),
    ('${ILTIC}', 'PP', 'OUEDRAOGO Adama',           '00098001D', NULL,                    'Secteur 15, Ouagadougou',              '+226 70 12 34 56', 'adama.oued@gmail.com',      true),
    ('${ILTIC}', 'PM', 'WIMRUX FINANCES SaaS',      'WIMRUX2026','WIMRUX-SAAS-001',       'Ouagadougou, Burkina Faso',            '+226 00 00 00 00', 'contact@wimrux.bf',         true)
  ON CONFLICT DO NOTHING`,

  // =========================================================================
  // CLIENTS pour WESTAGO SARL (Commerce général, import-export)
  // =========================================================================
  `INSERT INTO clients (company_id, type, name, ifu, rccm, address, phone, email, is_active) VALUES
    ('${WESTAGO}', 'PM', 'SONABHY',                  '00034567E', 'BF OUA 1985 B 03456',  'Rue de la Chance, Ouagadougou',        '+226 25 31 24 00', 'commercial@sonabhy.bf',     true),
    ('${WESTAGO}', 'PM', 'Groupe EBOMAF',             '00056789F', 'BF BOB 2005 M 05678',  'Bobo-Dioulasso, Hauts-Bassins',        '+226 20 97 10 00', 'contact@ebomaf.com',        true),
    ('${WESTAGO}', 'PM', 'ILTIC',                     '00080170C', '123456789',             'Ouagadougou, Burkina Faso',            '+226 65 75 10 89', 'ulrich@iltic.com',          true),
    ('${WESTAGO}', 'PP', 'KABORE Fatimata',            '00087654G', NULL,                    'Secteur 28, Bobo-Dioulasso',           '+226 76 54 32 10', 'fatimata.kab@yahoo.fr',     true),
    ('${WESTAGO}', 'PM', 'Société des Mines de Poura', '00023456H', 'BF POA 1999 B 02345',  'Poura, Boucle du Mouhoun',             '+226 20 54 00 00', 'admin@minespoura.bf',       true),
    ('${WESTAGO}', 'PM', 'WIMRUX FINANCES SaaS',       'WIMRUX2026','WIMRUX-SAAS-001',       'Ouagadougou, Burkina Faso',            '+226 00 00 00 00', 'contact@wimrux.bf',         true)
  ON CONFLICT DO NOTHING`,

  // =========================================================================
  // CLIENTS pour WIMRUX FINANCES SaaS (Éditeur du logiciel — ses clients sont
  // les entreprises qui utilisent la plateforme + partenaires)
  // =========================================================================
  `INSERT INTO clients (company_id, type, name, ifu, rccm, address, phone, email, is_active) VALUES
    ('${WIMRUX_SAAS}', 'PM', 'ILTIC',                  '00080170C', '123456789',             'Ouagadougou, Burkina Faso',            '+226 65 75 10 89', 'ulrich@iltic.com',          true),
    ('${WIMRUX_SAAS}', 'PM', 'WESTAGO SARL',            '00089946R', 'BF OUA 2021 M 13807',  'Ouagadougou, Burkina Faso',            '+226 25 65 01 51', 'contact@westago.bf',        true),
    ('${WIMRUX_SAAS}', 'PM', 'Pharmacie du Centre',     '00041122I', 'BF OUA 2015 B 04112',  '123 Rue du Marché, Ouagadougou',       '+226 25 30 80 80', 'pharma.centre@gmail.com',   true),
    ('${WIMRUX_SAAS}', 'PM', 'Hotel Splendide BF',      '00067890J', 'BF OUA 2018 B 06789',  'Zone du Bois, Ouagadougou',            '+226 25 49 10 10', 'reserv@splendide.bf',       true),
    ('${WIMRUX_SAAS}', 'PP', 'TRAORE Moussa',           '00099887K', NULL,                    'Secteur 4, Koudougou',                 '+226 71 99 88 77', 'moussa.traore@gmail.com',   true)
  ON CONFLICT DO NOTHING`,

  // =========================================================================
  // ARTICLES pour ILTIC (Services IT)
  // =========================================================================
  `INSERT INTO articles (company_id, code, name, type, tax_group, unit_price, specific_tax, is_active, stock_quantity) VALUES
    ('${ILTIC}', 'DEV-WEB',   'Développement site web',           'LOCSER', 'B', 500000,  0, true, 0),
    ('${ILTIC}', 'DEV-MOB',   'Développement application mobile', 'LOCSER', 'B', 750000,  0, true, 0),
    ('${ILTIC}', 'MAINT-AN',  'Maintenance annuelle serveur',     'LOCSER', 'B', 300000,  0, true, 0),
    ('${ILTIC}', 'HEBERGMT',  'Hébergement cloud / mois',         'LOCSER', 'B', 25000,   0, true, 0),
    ('${ILTIC}', 'FORM-IT',   'Formation informatique / jour',    'LOCSER', 'B', 150000,  0, true, 0),
    ('${ILTIC}', 'CONSUL-IT', 'Consultation IT / heure',          'LOCSER', 'B', 50000,   0, true, 0),
    ('${ILTIC}', 'LIC-SOFT',  'Licence logiciel (annuelle)',      'IMPBIE', 'B', 200000,  0, true, 50),
    ('${ILTIC}', 'PC-PORT',   'Ordinateur portable',              'IMPBIE', 'B', 450000,  0, true, 20),
    ('${ILTIC}', 'CABLE-RES', 'Câblage réseau / point',           'LOCBIE', 'B', 35000,   0, true, 500),
    ('${ILTIC}', 'SEC-AUDIT', 'Audit sécurité informatique',      'LOCSER', 'B', 1000000, 0, true, 0)
  ON CONFLICT DO NOTHING`,

  // =========================================================================
  // ARTICLES pour WESTAGO SARL (Commerce général, import-export)
  // =========================================================================
  `INSERT INTO articles (company_id, code, name, type, tax_group, unit_price, specific_tax, is_active, stock_quantity) VALUES
    ('${WESTAGO}', 'CIM-50KG',  'Ciment CPA 50kg',                'LOCBIE', 'B', 5500,    0, true, 2000),
    ('${WESTAGO}', 'FER-12MM',  'Fer à béton 12mm (barre 12m)',   'IMPBIE', 'B', 6500,    0, true, 1500),
    ('${WESTAGO}', 'TOLE-BG',   'Tôle bac galvanisée 0.35mm',    'IMPBIE', 'B', 4500,    0, true, 3000),
    ('${WESTAGO}', 'GRAV-M3',   'Gravier concassé / m³',          'LOCBIE', 'B', 12000,   0, true, 500),
    ('${WESTAGO}', 'SABLE-M3',  'Sable de rivière / m³',          'LOCBIE', 'B', 8000,    0, true, 800),
    ('${WESTAGO}', 'PEINTURE',  'Peinture acrylique 20L',         'IMPBIE', 'B', 35000,   0, true, 200),
    ('${WESTAGO}', 'TRANSP-T',  'Transport marchandise / tonne',  'LOCSER', 'B', 15000,   0, true, 0),
    ('${WESTAGO}', 'CARBU-L',   'Carburant gasoil / litre',       'LOCBIE', 'C', 750,     0, true, 10000),
    ('${WESTAGO}', 'MAIN-OEU',  'Main d''œuvre journalière',      'LOCSER', 'B', 5000,    0, true, 0),
    ('${WESTAGO}', 'BRIQUE-PL', 'Brique pleine 15x20x40',        'LOCBIE', 'B', 350,     0, true, 5000)
  ON CONFLICT DO NOTHING`,

  // =========================================================================
  // ARTICLES pour WIMRUX FINANCES SaaS (Abonnements, consulting, formation)
  // =========================================================================
  `INSERT INTO articles (company_id, code, name, type, tax_group, unit_price, specific_tax, is_active, stock_quantity) VALUES
    ('${WIMRUX_SAAS}', 'ABO-BASIC',  'Abonnement WIMRUX Basic / mois',    'LOCSER', 'B', 25000,   0, true, 0),
    ('${WIMRUX_SAAS}', 'ABO-PRO',    'Abonnement WIMRUX Pro / mois',      'LOCSER', 'B', 75000,   0, true, 0),
    ('${WIMRUX_SAAS}', 'ABO-ENTER',  'Abonnement WIMRUX Enterprise / mois','LOCSER', 'B', 150000, 0, true, 0),
    ('${WIMRUX_SAAS}', 'SETUP-INIT', 'Mise en place initiale',             'LOCSER', 'B', 200000,  0, true, 0),
    ('${WIMRUX_SAAS}', 'FORM-USR',   'Formation utilisateur / jour',       'LOCSER', 'B', 100000,  0, true, 0),
    ('${WIMRUX_SAAS}', 'FORM-ADM',   'Formation administrateur / jour',    'LOCSER', 'B', 150000,  0, true, 0),
    ('${WIMRUX_SAAS}', 'CONSULT-H',  'Consulting technique / heure',       'LOCSER', 'B', 50000,   0, true, 0),
    ('${WIMRUX_SAAS}', 'MIGR-DATA',  'Migration de données',               'LOCSER', 'B', 500000,  0, true, 0),
    ('${WIMRUX_SAAS}', 'CUSTOM-DEV', 'Développement personnalisé / jour',  'LOCSER', 'B', 250000,  0, true, 0),
    ('${WIMRUX_SAAS}', 'SUPPORT-PR', 'Support prioritaire / mois',         'LOCSER', 'B', 50000,   0, true, 0)
  ON CONFLICT DO NOTHING`,
];

async function run() {
  for (let i = 0; i < queries.length; i++) {
    const label = queries[i].substring(0, 60).replace(/\s+/g, ' ').trim();
    console.log(`\nStep ${i + 1}/${queries.length} — ${label}...`);
    try {
      await q(queries[i]);
      console.log('  ✅ OK');
    } catch (err) {
      console.error('  ❌ ERROR:', err.message.substring(0, 200));
    }
  }

  // Verify counts
  console.log('\n=== VERIFICATION ===');
  const clientCount = await q('SELECT company_id, count(*) as cnt FROM clients GROUP BY company_id');
  console.log('Clients par entreprise:', JSON.stringify(clientCount));
  const articleCount = await q('SELECT company_id, count(*) as cnt FROM articles GROUP BY company_id');
  console.log('Articles par entreprise:', JSON.stringify(articleCount));

  console.log('\n✅ Seed terminé avec succès !');
}

run().catch(console.error);
