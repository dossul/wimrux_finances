<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <div class="row justify-center items-center" style="min-height: 100vh; background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);">
        <div class="col-12 col-sm-8 col-md-5 col-lg-4 q-pa-md">
          <div class="text-center q-mb-lg">
            <q-icon name="account_balance" size="48px" color="white" class="q-mb-sm" />
            <div class="text-h4 text-weight-bold text-white">WIMRUX® FINANCES</div>
            <div class="text-caption text-blue-2">Système de Facturation Électronique — Burkina Faso</div>
          </div>
          <router-view />
          <div class="text-center q-mt-lg">
            <div class="text-caption text-blue-3">SFE homologué DGI · Conforme FNEC</div>
          </div>
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
</script>
