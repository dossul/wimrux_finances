<template>
  <q-page padding class="q-mx-auto" style="max-width: 800px">
    <h4 class="text-weight-bold">Politique de Confidentialité</h4>
    <p class="text-caption text-grey-7">Dernière mise à jour : {{ lastUpdated }}</p>

    <section class="q-mt-lg">
      <h6 class="text-weight-bold q-mb-sm">1. Responsable du traitement</h6>
      <p>WIMRUX SARL, Ouagadougou, Burkina Faso. Contact : privacy@wimrux.com</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">2. Données collectées</h6>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li><strong>Identité</strong> : nom, prénom, email, téléphone</li>
        <li><strong>Entreprise</strong> : raison sociale, IFU, adresse</li>
        <li><strong>Financières</strong> : factures, paiements, relevés bancaires (sur saisie)</li>
        <li><strong>Techniques</strong> : adresse IP, navigateur, logs d'utilisation</li>
        <li><strong>IA</strong> : prompts et réponses (anonymisés, non conservés au-delà de 90 jours)</li>
      </ul>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">3. Finalités</h6>
      <p>Fourniture du service, facturation, amélioration du produit, conformité légale, prévention fraude, support client.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">4. Base légale</h6>
      <p>Exécution du contrat (CGU), consentement explicite (cookies, marketing), intérêt légitime (sécurité), obligation légale (fiscalité).</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">5. Durée de conservation</h6>
      <p>Données comptables : 10 ans (obligation fiscale BF). Données personnelles : durée du compte + 1 an. Logs IA : 90 jours.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">6. Vos droits</h6>
      <p>Conformément au RGPD et à la loi burkinabè, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Rectification</strong> : corriger des données inexactes</li>
        <li><strong>Suppression</strong> : demander l'effacement (sous réserve d'obligations légales)</li>
        <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
        <li><strong>Opposition</strong> : s'opposer au traitement pour motif légitime</li>
      </ul>
      <p>Exercez vos droits via la page <router-link to="/app/settings/privacy">Confidentialité</router-link> ou par email à privacy@wimrux.com.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">7. Sous-traitants</h6>
      <p>InsForge (hébergement base de données), Vercel (hébergement frontend), LiteLLM (proxy IA). Tous situés dans des juridictions offrant un niveau de protection adéquat.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">8. Sécurité</h6>
      <p>Chiffrement TLS en transit, AES-256 au repos pour les clés API, RLS (Row Level Security) pour l'isolation des données par tenant, audits réguliers.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">9. Cookies</h6>
      <p>La plateforme utilise des cookies strictement nécessaires (session) et optionnels (analytics). Vous pouvez gérer vos préférences dans les paramètres de consentement.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">10. Contact</h6>
      <p>Pour toute question : privacy@wimrux.com · WIMRUX SARL, Ouagadougou, Burkina Faso</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
const lastUpdated = '25 mai 2026';
</script>
