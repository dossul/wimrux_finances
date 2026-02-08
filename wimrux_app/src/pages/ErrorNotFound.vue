<template>
  <div class="fullscreen bg-grey-2 text-center q-pa-md flex flex-center">
    <div>
      <q-icon name="search_off" size="120px" color="primary" class="q-mb-md" />
      <div class="text-h1 text-primary text-weight-bold">404</div>
      <div class="text-h5 text-grey-7 q-mt-sm">Page introuvable</div>
      <div class="text-body1 text-grey-5 q-mt-xs q-mb-xl">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </div>
      <q-btn
        color="primary"
        unelevated
        to="/"
        icon="home"
        label="Retour au tableau de bord"
        no-caps
        size="md"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
//
</script>
