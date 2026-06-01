// =============================================================================
// WIMRUX® FINANCES — Service IFU Scraper
// Vérification IFU sur dgi.bf/verification/verification-ifu
// Architecture : Express API → p-queue (concurrency:1) → Browserless KVM8 (wss://)
// Browserless partagé KVM8 : https://browserless.ulia.site (multi-projets)
// =============================================================================

import express from 'express';
import puppeteer from 'puppeteer-core';
import PQueue from 'p-queue';

// ── Configuration ─────────────────────────────────────────────────────────────
const PORT              = process.env.PORT              || 4200;
// Service Browserless KVM8 partagé (wss:// car TLS Traefik)
const BROWSERLESS_WS    = process.env.BROWSERLESS_WS    || 'wss://browserless.ulia.site';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || 'kvm8_browserless_shared_2026';
const DGI_URL           = 'https://dgi.bf/verification/verification-ifu';


// ── Queue applicative : 1 vérification à la fois, 3s entre chaque ─────────────
// CONCURRENT=1 côté Browserless + concurrency:1 ici = double protection
const queue = new PQueue({ concurrency: 1, interval: 3000, intervalCap: 1 });

// ── Résultats en mémoire (remplacé par DB en production) ─────────────────────
const resultCache = new Map();

// =============================================================================
// Fonction principale : scraper le formulaire DGI.bf
// =============================================================================
async function scrapeIfu(ifu) {
  // wss:// pour Browserless KVM8 (TLS via Traefik), ws:// pour local
  const wsUrl = `${BROWSERLESS_WS}/chromium?token=${BROWSERLESS_TOKEN}`;

  let browser;
  try {
    // Se connecter au pool Browserless partagé (sans créer de nouveau Chrome)
    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();

    // Bloquer images/fonts pour aller plus vite
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Charger la page DGI
    await page.goto(DGI_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Champ IFU — sélecteur exact inspecté sur dgi.bf (input#inputImmat name="IFU")
    const ifuSelectors = [
      'input#inputImmat',
      'input[name="IFU"]',
      'input[placeholder*="IFU"]',
      'input[type="text"]:first-of-type',
    ];

    let inputSelector = null;
    for (const sel of ifuSelectors) {
      const el = await page.$(sel);
      if (el) { inputSelector = sel; break; }
    }

    if (!inputSelector) {
      // Fallback : dump du HTML pour debug
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
      return {
        ifu,
        statut: 'erreur',
        message: 'Champ IFU introuvable sur la page DGI',
        debug: bodyText,
      };
    }

    // Effacer + remplir le champ
    await page.click(inputSelector, { clickCount: 3 });
    await page.type(inputSelector, String(ifu), { delay: 50 });

    // Soumettre — bouton exact DGI.bf : button.bouton-verifier
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.click('button.bouton-verifier, button[type="submit"]'),
    ]);

    // ── Extraction — sélecteurs exacts DGI.bf (div.cadre-reponse > table) ─────
    const resultat = await page.evaluate(() => {
      // Sélecteur confirmé par inspection HTML réelle de dgi.bf
      const reponseDiv = document.querySelector('div.cadre-reponse');
      if (!reponseDiv) {
        return { brut: document.body.innerText.slice(0, 800), found: false };
      }
      const table = reponseDiv.querySelector('table');
      if (!table) {
        return { brut: reponseDiv.innerText.slice(0, 800), found: false };
      }

      // Extraire TOUS les champs sous forme de tableau ordonné [{label, valeur}]
      // + dictionnaire normalisé pour l'interprétation
      const champs = [];   // [{label: "Nom / Raison Sociale", valeur: "CBC SA"}]
      const donnees = {};  // {nom_raison_sociale: "CBC SA", ...}
      let etatCellule = '';

      table.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label  = cells[0].innerText.trim();
          const valeur = cells[1].innerText.trim();
          champs.push({ label, valeur });
          // Clé normalisée (alphanumérique uniquement)
          const cle = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          donnees[cle] = valeur;
          if (/^etat$/i.test(label.trim())) {
            etatCellule = valeur.trim().toUpperCase();
          }
        }
      });

      const texte = table.innerText.trim();
      // DGI : "ACTIF" = actif | "DESACTIVE" = bloqué | absence de résultat = introuvable
      const desactive = /^DESACTIV[EÉ]/.test(etatCellule);
      const actif     = etatCellule === 'ACTIF';
      const invalide  = champs.length === 0 || /introuvable|inexistant|not found/i.test(texte);

      return { texte, champs, donnees, etatCellule, found: true,
               isValid: actif, isDesactive: desactive, isInvalid: invalide };
    });

    // ── Construction du résultat final ────────────────────────────────────────
    let etat = 'INCONNU';
    if (resultat.isDesactive)    etat = 'DESACTIVE';
    else if (resultat.isValid)   etat = 'ACTIF';
    else if (resultat.isInvalid) etat = 'INVALIDE';

    // Valeurs brutes depuis les champs extraits
    const d   = resultat.donnees || {};
    const clean = (v) => (!v || /^DESACTIV[EÉ]$/i.test(v) || v === 'NUMERO IFU DESACTIVE') ? '' : v;
    const nom       = clean(d['nom_raison_sociale'] || d['nom'] || '');
    const rccm      = clean(d['n_rccm'] || d['rccm'] || '');
    const regime    = clean(d['r_gime_fiscal'] || d['regime_fiscal'] || d['regime'] || '');
    const direction = clean(d['direction_de_rattachement'] || d['direction'] || '');
    const siege     = clean(d['si_ge'] || d['siege'] || '');
    const forme_jur = clean(d['forme_juridique'] || '');
    const telephone = clean(d['t_l_phone'] || d['telephone'] || '');
    const mail      = clean(d['mail'] || d['email'] || '');
    const adresse   = clean(d['adresse'] || '');

    await page.close();

    return {
      ifu,
      statut: 'ok',
      resultat: {
        etat,
        nom,
        rccm,
        regime,
        direction,
        siege,
        forme_jur,
        telephone,
        mail,
        adresse,
        // Tableau complet ordonné pour l'accordéon Vue (label + valeur brute DGI)
        champs: (resultat.champs || []).map(c => ({
          label:  c.label,
          valeur: c.valeur,
          actif:  !/^DESACTIV[EÉ]$/i.test(c.valeur) && c.valeur !== 'NUMERO IFU DESACTIVE',
        })),
        etatCellule: resultat.etatCellule,
        brut: resultat.texte || '',
      },
    };



  } catch (err) {
    return {
      ifu,
      statut: 'erreur',
      message: err.message,
    };
  } finally {
    // IMPORTANT : disconnect (pas close) pour libérer le slot Browserless
    if (browser) {
      try { browser.disconnect(); } catch {}
    }
  }
}

// =============================================================================
// API Express
// =============================================================================
const app = express();
app.use(express.json());

// CORS pour le frontend WIMRUX
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Santé du service ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    queue: { size: queue.size, pending: queue.pending },
    browserless: BROWSERLESS_WS,
  });
});

// ── Vérification IFU unique ───────────────────────────────────────────────────
app.post('/verify', async (req, res) => {
  const { ifu } = req.body;

  if (!ifu || typeof ifu !== 'string' || ifu.trim().length < 7) {
    return res.status(400).json({ error: 'IFU invalide ou manquant (min 7 caractères)' });
  }

  const ifuClean = ifu.trim();

  // Cache : éviter de re-scraper un IFU récent (TTL 24h)
  const cached = resultCache.get(ifuClean);
  if (cached && (Date.now() - cached.timestamp < 86400000)) {
    return res.json({ ...cached.data, fromCache: true });
  }

  // Ajouter à la queue et attendre le résultat
  const result = await queue.add(() => scrapeIfu(ifuClean));
  resultCache.set(ifuClean, { data: result, timestamp: Date.now() });

  res.json(result);
});

// ── Vérification batch (liste d'IFUs) ────────────────────────────────────────
app.post('/verify-batch', async (req, res) => {
  const { ifus } = req.body;

  if (!Array.isArray(ifus) || ifus.length === 0) {
    return res.status(400).json({ error: 'Tableau "ifus" requis et non vide' });
  }
  if (ifus.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 IFUs par batch' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  const results = [];
  const tasks = ifus.map(ifu => async () => {
    const result = await scrapeIfu(ifu.trim());
    results.push(result);
    // Streaming partiel (chaque résultat au fur et à mesure)
    res.write(JSON.stringify({ progress: results.length, total: ifus.length, result }) + '\n');
    return result;
  });

  for (const task of tasks) {
    await queue.add(task);
  }

  res.end(JSON.stringify({ done: true, total: results.length, results }));
});

// ── Pression queue ────────────────────────────────────────────────────────────
app.get('/pressure', (req, res) => {
  res.json({
    running: queue.pending,
    queued:  queue.size,
    concurrency: 1,
  });
});

app.listen(PORT, () => {
  console.log(`[WIMRUX IFU Scraper] Service démarré → http://localhost:${PORT}`);
  console.log(`[WIMRUX IFU Scraper] Browserless → ${BROWSERLESS_WS}`);
});
