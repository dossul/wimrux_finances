<template>
  <q-page padding class="q-mx-auto" style="max-width: 800px">
    <h4 class="text-weight-bold">Conditions Générales d'Utilisation</h4>
    <p class="text-caption text-grey-7">Dernière mise à jour : {{ lastUpdated }}</p>

    <section class="q-mt-lg">
      <h6 class="text-weight-bold q-mb-sm">1. Objet</h6>
      <p>Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation de la plateforme WIMRUX® FINANCES, éditée par WIMRUX SARL, immatriculée au Burkina Faso sous le numéro RCCM BF-OUA-XX-XXXX.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">2. Définitions</h6>
      <p><strong>Plateforme</strong> : application SaaS de gestion financière WIMRUX® FINANCES.<br />
      <strong>Utilisateur</strong> : toute personne physique ou morale accédant à la Plateforme.<br />
      <strong>Tenant</strong> : entité entreprise inscrite utilisant les services multi-tenant.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">3. Inscription et compte</h6>
      <p>L'inscription implique l'acceptation des présentes CGU. L'utilisateur garantit l'exactitude des informations fournies. Les identifiants sont personnels et non cessibles.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">4. Services</h6>
      <p>La Plateforme propose des services de comptabilité, facturation, trésorerie, gestion d'actifs, rapports financiers, et intelligence artificielle (sous réserve de disponibilité).</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">5. Tarification</h6>
      <p>Les plans d'abonnement (Free, Starter, Pro, Enterprise) et crédits IA sont détaillés sur la page Tarifs. Les prix sont en XOF et hors taxes le cas échéant.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">6. Protection des données</h6>
      <p>Le traitement des données personnelles est régi par notre <router-link to="/legal/privacy">Politique de Confidentialité</router-link>, conforme au RGPD et à la loi n°001-2021/AN du Burkina Faso relative à la protection des données à caractère personnel.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">7. Responsabilité</h6>
      <p>WIMRUX SARL s'engage à fournir un service raisonnable mais ne saurait être tenu responsable des interruptions, pertes de données ou préjudices indirects.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">8. Résiliation</h6>
      <p>L'utilisateur peut résilier son compte à tout moment. WIMRUX SARL se réserve le droit de suspendre tout compte en cas de violation des CGU.</p>
    </section>

    <section class="q-mt-md">
      <h6 class="text-weight-bold q-mb-sm">9. Droit applicable</h6>
      <p>Les présentes CGU sont soumises au droit burkinabè. Tout litige sera porté devant les tribunaux compétents de Ouagadougou.</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
const lastUpdated = '25 mai 2026';
</script>
