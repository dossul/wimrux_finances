# Gate de déploiement E2E — WIMRUX® Finances

Ce workflow définit la condition de déploiement en production.

## Prérequis avant déploiement

1. **Smoke tests** — navigation sur toutes les pages critiques
   ```bash
   npm run test:e2e:smoke
   ```

2. **Tests fonctionnels métier** — parcours clients, factures, trésorerie, OCR
   ```bash
   npm run test:e2e:functional
   ```

## Règle de gate

La commande `vercel deploy --prod` ne doit être exécutée **que si** les deux suites ci-dessus sont vertes.

```bash
npm run test:e2e:smoke
npm run test:e2e:functional
# Si les deux commandes retournent 0 :
vercel deploy --prod --yes
```

> Échec fonctionnel = pas de déploiement.

## Commandes utiles

- Tous les tests E2E : `npm run test:e2e:all`
- Seuls les tests fonctionnels : `npm run test:e2e:functional`
- Seuls les smoke tests : `npm run test:e2e:smoke`
