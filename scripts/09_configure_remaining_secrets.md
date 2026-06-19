# Phase 9 : Configuration des secrets restants

## Secrets déjà configurés

- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT`, `APPWRITE_DATABASE` sur toutes les fonctions
- `LITELLM_BASE_URL` = `https://litellm.ulia.site/v1` sur ai-router
- `WHAPI_TOKEN` sur send-otp-whatsapp
- `SMTP_PORT`, `FROM_EMAIL`, `FROM_NAME` sur send-email

## Secrets manquants à configurer

### 1. ai-router — LITELLM_API_KEY
```powershell
C:\nvm4w\nodejs\appwrite.cmd functions create-variable --function-id ai-router --key LITELLM_API_KEY --value "VOTRE_CLE_LITELLM"
```

### 2. send-email — SMTP_HOST, SMTP_USER, SMTP_PASS
```powershell
C:\nvm4w\nodejs\appwrite.cmd functions create-variable --function-id send-email --key SMTP_HOST --value "smtp.votre-fournisseur.com"
C:\nvm4w\nodejs\appwrite.cmd functions create-variable --function-id send-email --key SMTP_USER --value "votre-email@domaine.com"
C:\nvm4w\nodejs\appwrite.cmd functions create-variable --function-id send-email --key SMTP_PASS --value "votre-mot-de-passe-smtp"
```

### 3. Vérifier/ajouter APPWRITE_KEY (Admin API Key) sur toutes les fonctions
Si les fonctions ont besoin d'accéder à la base en mode admin :
```powershell
foreach ($fid in @("ai-router","send-email","verify-otp","send-otp-whatsapp","verify-tax-id","export-report","cashflow-forecast","detect-anomalies","ingest-payment","nl-to-sql")) {
  C:\nvm4w\nodejs\appwrite.cmd functions create-variable --function-id $fid --key APPWRITE_KEY --value "VOTRE_ADMIN_API_KEY"
}
```
