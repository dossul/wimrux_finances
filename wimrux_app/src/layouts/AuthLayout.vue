<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <div class="row justify-center items-center" style="min-height: 100vh; background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);">
        <div class="col-12 col-sm-8 col-md-5 col-lg-4 q-pa-md">
          <div class="text-center q-mb-lg">
            <img src="/wimrux_finance_logo.png" alt="WIMRUX" style="height:56px; width:auto; filter: brightness(0) invert(1);" class="q-mb-sm" />
            <div class="text-h4 text-weight-bold text-white">WIMRUX® Finances</div>
            <div class="text-caption text-blue-2">Gestion financière & Facturation — Burkina Faso</div>
          </div>
          <router-view />
          <div class="text-center q-mt-lg">
            <div class="text-caption text-blue-3">Solution de gestion financière &amp; facturation</div>
          </div>
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
</script>
