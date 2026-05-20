<template>
  <q-layout>
    <!-- Navbar Transparent -->
    <q-header class="navbar-transparent" :class="{ 'navbar-scrolled': scrolled }">
      <q-toolbar class="container">
        <q-avatar size="42px" class="q-mr-sm">
          <q-icon name="account_balance" size="28px" color="white" />
        </q-avatar>
        <q-toolbar-title class="text-weight-bold text-white">
          WIMRUX<span class="text-orange">®</span> FINANCES
        </q-toolbar-title>
        <q-space />
        <div class="gt-sm">
          <q-btn flat label="Fonctionnalités" text-color="white" @click="scrollTo('features')" />
          <q-btn flat label="Avantages" text-color="white" @click="scrollTo('benefits')" />
          <q-btn flat label="Conformité" text-color="white" @click="scrollTo('compliance')" />
          <q-btn flat label="Tarifs" text-color="white" @click="scrollTo('pricing')" />
        </div>
        <q-btn outline color="white" label="Connexion" to="/auth/login" class="q-ml-md" />
        <q-btn
          color="orange"
          text-color="white"
          label="Voir la Démo"
          icon="play_circle"
          class="q-ml-sm"
          @click="showDemo = true"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <!-- HERO SECTION -->
      <section class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content container text-white">
          <div class="row items-center" style="min-height: 100vh">
            <div class="col-12 col-md-7">
              <q-chip color="orange" text-color="white" icon="trending_up" class="q-mb-lg animate-fade-in">
                🚀 Gérez vos finances comme un pro
              </q-chip>

              <h1 class="hero-title animate-fade-in">
                Votre gestion financière.<br />
                <span class="text-orange">Simplifiée.</span>
              </h1>

              <p class="hero-subtitle animate-fade-in-delay">
                <strong>WIMRUX® FINANCES</strong> est la plateforme complète de gestion financière
                pour entreprises modernes. Facturation, trésorerie, rapports et IA —
                <em>tout dans une seule solution intuitive</em>.
              </p>

              <div class="hero-stats q-mt-xl q-mb-xl animate-fade-in-delay2">
                <div class="stat-item">
                  <span class="stat-number">∞</span>
                  <span class="stat-label">Factures/mois</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">AI</span>
                  <span class="stat-label">Assistant intégré</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">24/7</span>
                  <span class="stat-label">Disponibilité</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">0</span>
                  <span class="stat-label">Installation requise</span>
                </div>
              </div>

              <div class="q-gutter-md animate-fade-in-delay2">
                <q-btn
                  color="orange"
                  text-color="white"
                  size="xl"
                  label="Demander une Démo"
                  icon="play_circle"
                  unelevated
                  @click="showDemo = true"
                />
                <q-btn
                  outline
                  color="white"
                  size="xl"
                  label="Essai Gratuit 30 Jours"
                  icon="rocket_launch"
                  to="/auth/login"
                />
              </div>

              <p class="text-caption q-mt-lg" style="opacity: 0.7">
                ✓ Aucune carte requise &nbsp;•&nbsp; ✓ Installation en 5 minutes &nbsp;•&nbsp; ✓ Support inclus
              </p>
            </div>

            <div class="col-12 col-md-5 gt-sm text-center">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"
                alt="Facture électronique"
                class="hero-image animate-float"
              />
            </div>
          </div>
        </div>

        <!-- Scroll indicator -->
        <div class="scroll-indicator" @click="scrollTo('problem')">
          <q-icon name="keyboard_double_arrow_down" size="32px" color="white" />
        </div>
      </section>

      <!-- PROBLEM SECTION -->
      <section id="problem" class="section-padding bg-grey-1">
        <div class="container">
          <div class="row items-center q-col-gutter-xl">
            <div class="col-12 col-md-6">
              <img
                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80"
                alt="Conformité fiscale"
                class="section-image rounded-borders"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-chip color="primary" text-color="white" icon="lightbulb" class="q-mb-md">
                Pourquoi WIMRUX® ?
              </q-chip>
              <h2 class="section-title">
                La gestion financière, <span class="text-primary">réinventée</span>.
              </h2>
              <p class="section-text">
                Les entrepreneurs perdent <strong>plusieurs heures par semaine</strong>
                à gérer manuellement leurs factures, leur trésorerie et leurs rapports.
                <strong>WIMRUX® FINANCES</strong> centralise tout en une seule plateforme puissante.
              </p>

              <q-list class="q-mt-lg">
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Facturation professionnelle</q-item-label>
                    <q-item-label caption>Créez et envoyez des factures élégantes en quelques clics</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Trésorerie en temps réel</q-item-label>
                    <q-item-label caption>Suivez vos comptes, caisse et mobile money instantanément</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Rapports automatisés</q-item-label>
                    <q-item-label caption>Dashboard KPIs et rapports exportables en un clic</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-btn
                color="primary"
                size="lg"
                label="Découvrir les fonctionnalités"
                icon="check_circle"
                class="q-mt-lg"
                @click="scrollTo('features')"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURES SECTION -->
      <section id="features" class="section-padding">
        <div class="container text-center">
          <q-chip color="primary" text-color="white" icon="auto_awesome" class="q-mb-md">
            Solution Complète
          </q-chip>
          <h2 class="section-title">
            Tout ce dont vous avez besoin.<br />
            <span class="text-primary">Dans une seule plateforme.</span>
          </h2>
          <p class="section-subtitle">
            WIMRUX® FINANCES n'est pas qu'un simple logiciel de facturation.
            C'est votre partenaire pour une gestion financière sereine et conforme.
          </p>

          <!-- Feature Carousel -->
          <q-carousel
            v-model="featureSlide"
            animated
            arrows
            navigation
            infinite
            autoplay
            class="features-carousel q-mt-xl"
          >
            <q-carousel-slide :name="1" class="column no-wrap">
              <div class="row q-col-gutter-lg q-px-xl">
                <div class="col-12 col-md-4" v-for="f in features.slice(0, 3)" :key="f.title">
                  <q-card flat class="feature-card-modern">
                    <q-card-section>
                      <div class="feature-icon-wrapper" :style="{ background: f.gradient }">
                        <q-icon :name="f.icon" size="32px" color="white" />
                      </div>
                      <h3 class="text-h6 text-weight-bold q-mt-lg q-mb-sm">{{ f.title }}</h3>
                      <p class="text-body2 text-grey-7">{{ f.description }}</p>
                      <q-list dense class="q-mt-md">
                        <q-item v-for="(point, i) in f.points" :key="i" class="q-px-none">
                          <q-item-section avatar style="min-width: 28px">
                            <q-icon name="check" color="green" size="18px" />
                          </q-item-section>
                          <q-item-section class="text-left text-caption">{{ point }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-carousel-slide>

            <q-carousel-slide :name="2" class="column no-wrap">
              <div class="row q-col-gutter-lg q-px-xl">
                <div class="col-12 col-md-4" v-for="f in features.slice(3, 6)" :key="f.title">
                  <q-card flat class="feature-card-modern">
                    <q-card-section>
                      <div class="feature-icon-wrapper" :style="{ background: f.gradient }">
                        <q-icon :name="f.icon" size="32px" color="white" />
                      </div>
                      <h3 class="text-h6 text-weight-bold q-mt-lg q-mb-sm">{{ f.title }}</h3>
                      <p class="text-body2 text-grey-7">{{ f.description }}</p>
                      <q-list dense class="q-mt-md">
                        <q-item v-for="(point, i) in f.points" :key="i" class="q-px-none">
                          <q-item-section avatar style="min-width: 28px">
                            <q-icon name="check" color="green" size="18px" />
                          </q-item-section>
                          <q-item-section class="text-left text-caption">{{ point }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-carousel-slide>

            <q-carousel-slide :name="3" class="column no-wrap">
              <div class="row q-col-gutter-lg q-px-xl">
                <div class="col-12 col-md-4" v-for="f in features.slice(6, 9)" :key="f.title">
                  <q-card flat class="feature-card-modern">
                    <q-card-section>
                      <div class="feature-icon-wrapper" :style="{ background: f.gradient }">
                        <q-icon :name="f.icon" size="32px" color="white" />
                      </div>
                      <h3 class="text-h6 text-weight-bold q-mt-lg q-mb-sm">{{ f.title }}</h3>
                      <p class="text-body2 text-grey-7">{{ f.description }}</p>
                      <q-list dense class="q-mt-md">
                        <q-item v-for="(point, i) in f.points" :key="i" class="q-px-none">
                          <q-item-section avatar style="min-width: 28px">
                            <q-icon name="check" color="green" size="18px" />
                          </q-item-section>
                          <q-item-section class="text-left text-caption">{{ point }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-carousel-slide>
          </q-carousel>
        </div>
      </section>

      <!-- BENEFITS SECTION -->
      <section id="benefits" class="section-padding bg-dark text-white">
        <div class="container">
          <div class="row items-center q-col-gutter-xl">
            <div class="col-12 col-md-6">
              <q-chip color="orange" text-color="white" icon="trending_up" class="q-mb-md">
                ROI Garanti
              </q-chip>
              <h2 class="section-title text-white">
                Pourquoi les entreprises<br />
                <span class="text-orange">choisissent WIMRUX®</span>
              </h2>

              <div class="benefits-grid q-mt-xl">
                <div class="benefit-item" v-for="b in benefits" :key="b.title">
                  <div class="benefit-icon">
                    <q-icon :name="b.icon" size="24px" :color="b.color" />
                  </div>
                  <div>
                    <h4 class="text-weight-bold q-mb-xs">{{ b.title }}</h4>
                    <p class="text-caption" style="opacity: 0.8">{{ b.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"
                alt="Dashboard analytics"
                class="section-image rounded-borders"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- CONNECT SECTION -->
      <section id="compliance" class="section-padding">
        <div class="container text-center">
          <q-chip color="green" text-color="white" icon="link" class="q-mb-md">
            Intégration Certifiée
          </q-chip>
          <h2 class="section-title">
            Besoin de certification fiscale ?<br />
            <span class="text-green">Connectez WIMRUX FACTURATION</span>
          </h2>

          <div class="compliance-badges q-mt-xl">
            <div class="row q-col-gutter-lg justify-center">
              <div class="col-6 col-md-3" v-for="c in connectFeatures" :key="c.title">
                <q-card flat bordered class="compliance-card">
                  <q-card-section class="text-center">
                    <q-icon :name="c.icon" size="48px" :color="c.color" />
                    <h4 class="text-weight-bold q-mt-md q-mb-xs">{{ c.title }}</h4>
                    <p class="text-caption text-grey-7">{{ c.description }}</p>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <q-card flat bordered class="q-mt-xl q-pa-lg bg-green-1">
            <div class="row items-center">
              <div class="col-12 col-md-8 text-left">
                <h3 class="text-h5 text-weight-bold text-green-9">
                  🌍 Vous opérez au Burkina Faso ?
                </h3>
                <p class="text-body2 q-mt-sm">
                  WIMRUX® FINANCES s'intègre avec <strong>WIMRUX FACTURATION</strong>,
                  notre application desktop certifiée pour la conformité SECeF.
                  Vos factures sont certifiées automatiquement via l'appareil MCF.
                </p>
              </div>
              <div class="col-12 col-md-4 text-center">
                <q-btn
                  color="green"
                  size="lg"
                  label="En savoir plus"
                  to="/app/settings"
                />
              </div>
            </div>
          </q-card>
        </div>
      </section>

      <!-- PRICING SECTION -->
      <section id="pricing" class="section-padding bg-grey-1">
        <div class="container text-center">
          <h2 class="section-title">
            Un tarif simple.<br />
            <span class="text-primary">Pas de surprises.</span>
          </h2>
          <p class="section-subtitle">
            Forfait mensuel tout inclus. Démarrez en 5 minutes.
          </p>

          <div class="row q-col-gutter-lg justify-center q-mt-xl">
            <div class="col-12 col-md-4">
              <q-card flat bordered class="pricing-card">
                <q-card-section>
                  <p class="text-overline text-grey-7">ESSENTIEL</p>
                  <h3 class="text-h3 text-weight-bold">25 000<span class="text-h6"> FCFA/mois</span></h3>
                  <p class="text-caption text-grey-6">Par utilisateur</p>

                  <q-separator class="q-my-lg" />

                  <q-list dense>
                    <q-item v-for="f in pricingFeatures.essential" :key="f">
                      <q-item-section avatar style="min-width: 28px">
                        <q-icon name="check_circle" color="green" size="20px" />
                      </q-item-section>
                      <q-item-section class="text-left">{{ f }}</q-item-section>
                    </q-item>
                  </q-list>

                  <q-btn
                    outline
                    color="primary"
                    label="Commencer"
                    class="full-width q-mt-lg"
                    to="/auth/login"
                  />
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-4">
              <q-card flat class="pricing-card pricing-card-featured">
                <q-ribbon position="top-right" color="orange">
                  Populaire
                </q-ribbon>
                <q-card-section>
                  <p class="text-overline">PROFESSIONNEL</p>
                  <h3 class="text-h3 text-weight-bold">45 000<span class="text-h6"> FCFA/mois</span></h3>
                  <p class="text-caption" style="opacity: 0.8">Par utilisateur</p>

                  <q-separator class="q-my-lg" dark />

                  <q-list dense>
                    <q-item v-for="f in pricingFeatures.professional" :key="f">
                      <q-item-section avatar style="min-width: 28px">
                        <q-icon name="check_circle" color="orange" size="20px" />
                      </q-item-section>
                      <q-item-section class="text-left">{{ f }}</q-item-section>
                    </q-item>
                  </q-list>

                  <q-btn
                    color="orange"
                    label="Essai gratuit 30j"
                    class="full-width q-mt-lg"
                    to="/auth/login"
                  />
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-4">
              <q-card flat bordered class="pricing-card">
                <q-card-section>
                  <p class="text-overline text-grey-7">ENTREPRISE</p>
                  <h3 class="text-h3 text-weight-bold">Sur devis</h3>
                  <p class="text-caption text-grey-6">Solution personnalisée</p>

                  <q-separator class="q-my-lg" />

                  <q-list dense>
                    <q-item v-for="f in pricingFeatures.enterprise" :key="f">
                      <q-item-section avatar style="min-width: 28px">
                        <q-icon name="check_circle" color="green" size="20px" />
                      </q-item-section>
                      <q-item-section class="text-left">{{ f }}</q-item-section>
                    </q-item>
                  </q-list>

                  <q-btn
                    outline
                    color="primary"
                    label="Nous contacter"
                    class="full-width q-mt-lg"
                    href="mailto:contact@wimrux.bf"
                  />
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA SECTION -->
      <section class="cta-section">
        <div class="cta-overlay"></div>
        <div class="container text-center text-white" style="position: relative; z-index: 2">
          <h2 class="text-h3 text-weight-bold q-mb-md">
            Prêt à transformer votre gestion financière ?
          </h2>
          <p class="text-h6 q-mb-xl" style="opacity: 0.9; max-width: 600px; margin: 0 auto">
            Rejoignez les entreprises modernes qui ont choisi WIMRUX® FINANCES
            pour piloter leur activité avec sérénité.
          </p>
          <div class="q-gutter-md">
            <q-btn
              color="orange"
              text-color="white"
              size="xl"
              label="Démarrer maintenant"
              icon="rocket_launch"
              to="/auth/login"
            />
            <q-btn
              outline
              color="white"
              size="xl"
              label="Voir la démo"
              icon="play_circle"
              @click="showDemo = true"
            />
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="footer-section">
        <div class="container">
          <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-4">
              <div class="q-mb-md">
                <q-icon name="account_balance" size="32px" color="white" />
                <span class="text-h6 text-weight-bold text-white q-ml-sm">WIMRUX® FINANCES</span>
              </div>
              <p class="text-body2" style="opacity: 0.7">
                Solution SaaS complète de gestion financière : facturation, trésorerie, rapports
                et assistant IA pour entreprises modernes.
              </p>
              <div class="q-mt-lg q-gutter-sm">
                <q-chip size="sm" color="blue-8" text-color="white">SaaS Cloud</q-chip>
                <q-chip size="sm" color="purple-8" text-color="white">IA Intégrée</q-chip>
              </div>
            </div>

            <div class="col-6 col-md-2">
              <h4 class="footer-title">Produit</h4>
              <q-list dense dark>
                <q-item clickable @click="scrollTo('features')">
                  <q-item-section>Fonctionnalités</q-item-section>
                </q-item>
                <q-item clickable @click="scrollTo('pricing')">
                  <q-item-section>Tarifs</q-item-section>
                </q-item>
                <q-item clickable @click="showDemo = true">
                  <q-item-section>Démo</q-item-section>
                </q-item>
              </q-list>
            </div>

            <div class="col-6 col-md-2">
              <h4 class="footer-title">Entreprise</h4>
              <q-list dense dark>
                <q-item clickable>
                  <q-item-section>À propos</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Contact</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Partenaires</q-item-section>
                </q-item>
              </q-list>
            </div>

            <div class="col-12 col-md-4">
              <h4 class="footer-title">Contact</h4>
              <p class="text-body2" style="opacity: 0.7">
                <q-icon name="email" class="q-mr-sm" /> contact@wimrux.bf<br />
                <q-icon name="phone" class="q-mr-sm" /> +226 00 00 00 00<br />
                <q-icon name="location_on" class="q-mr-sm" /> Ouagadougou, Burkina Faso
              </p>
            </div>
          </div>

          <q-separator dark class="q-my-lg" />

          <div class="row items-center">
            <div class="col-12 col-md-6 text-center text-md-left">
              <p class="text-caption" style="opacity: 0.5">
                © 2026 WIMRUX® FINANCES. Tous droits réservés. Développé par ILTIC.
              </p>
            </div>
            <div class="col-12 col-md-6 text-center text-md-right">
              <q-btn flat dense icon="fab fa-linkedin" color="white" href="#" />
              <q-btn flat dense icon="fab fa-twitter" color="white" href="#" />
              <q-btn flat dense icon="fab fa-facebook" color="white" href="#" />
            </div>
          </div>
        </div>
      </footer>
    </q-page-container>

    <!-- Demo Video Dialog -->
    <q-dialog v-model="showDemo" maximized>
      <q-card class="bg-black">
        <q-bar class="bg-grey-9">
          <div class="text-white">Démonstration WIMRUX® FINANCES</div>
          <q-space />
          <q-btn dense flat icon="close" color="white" v-close-popup />
        </q-bar>
        <q-card-section class="flex flex-center" style="height: calc(100vh - 50px)">
          <div class="text-center text-white">
            <q-icon name="play_circle" size="120px" color="orange" />
            <h3 class="q-mt-lg">Vidéo de démonstration</h3>
            <p class="text-grey-5">Découvrez WIMRUX® FINANCES en action</p>
            <q-btn
              color="orange"
              label="Accéder à la plateforme"
              to="/auth/login"
              class="q-mt-lg"
              v-close-popup
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const showDemo = ref(false);
const featureSlide = ref(1);

const features = [
  {
    icon: 'receipt_long',
    title: 'Facturation Pro',
    gradient: 'linear-gradient(135deg, #1976d2, #0d47a1)',
    description: 'Créez des factures professionnelles et suivez vos paiements facilement.',
    points: ['Modèles personnalisables', 'Relances automatiques', 'Statuts de paiement en temps réel']
  },
  {
    icon: 'calculate',
    title: 'Gestion Multi-Devises',
    gradient: 'linear-gradient(135deg, #43a047, #2e7d32)',
    description: 'Gérez votre activité dans plusieurs devises avec conversion automatique.',
    points: ['XOF, EUR, USD, GBP', 'Taux de change automatiques', 'Rapports par devise']
  },
  {
    icon: 'people',
    title: 'Gestion Clients',
    gradient: 'linear-gradient(135deg, #fb8c00, #ef6c00)',
    description: 'Fichier client complet avec historique des transactions.',
    points: ['Fiches clients détaillées', 'Historique des factures', 'Segmentation avancée']
  },
  {
    icon: 'account_balance_wallet',
    title: 'Trésorerie Unifiée',
    gradient: 'linear-gradient(135deg, #8e24aa, #6a1b9a)',
    description: 'Tous vos comptes en un seul endroit: banque, caisse, mobile money.',
    points: ['Multi-comptes illimités', '7 modes de paiement', 'Rapprochement bancaire']
  },
  {
    icon: 'analytics',
    title: 'Rapports & KPIs',
    gradient: 'linear-gradient(135deg, #00897b, #00695c)',
    description: 'Tableau de bord temps réel et rapports d\'activité détaillés.',
    points: ['Dashboard KPIs en direct', 'Export CSV, PDF, Excel', 'Prévisions de trésorerie']
  },
  {
    icon: 'gavel',
    title: 'Journal d\'Audit',
    gradient: 'linear-gradient(135deg, #e53935, #c62828)',
    description: 'Traçabilité complète de toutes les actions pour plus de sécurité.',
    points: ['Historique des modifications', 'Données sécurisées', 'Conformité RGPD']
  },
  {
    icon: 'psychology',
    title: 'Assistant IA',
    gradient: 'linear-gradient(135deg, #5c6bc0, #3949ab)',
    description: 'Un assistant intelligent pour vous aider au quotidien.',
    points: ['Questions en langage naturel', 'Analyse de vos données', 'Conseils personnalisés']
  },
  {
    icon: 'smart_toy',
    title: 'API & Chatbot',
    gradient: 'linear-gradient(135deg, #26a69a, #00897b)',
    description: 'Intégrez WIMRUX à vos canaux de communication.',
    points: ['WhatsApp, Telegram, Email', 'Permissions granulaires', 'Webhooks disponibles']
  },
  {
    icon: 'business',
    title: 'Multi-Entreprise',
    gradient: 'linear-gradient(135deg, #78909c, #546e7a)',
    description: 'Gérez plusieurs entités dans une seule interface.',
    points: ['Isolation totale des données', 'Rôles par entreprise', 'Consolidation des rapports']
  }
];

const benefits = [
  { icon: 'timer', title: 'Gain de temps', description: 'Automatisez les tâches répétitives et gagnez 10h/semaine', color: 'orange' },
  { icon: 'savings', title: 'Économies', description: 'Réduisez les erreurs et optimisez votre trésorerie', color: 'green' },
  { icon: 'security', title: 'Sécurité', description: 'Vos données sont chiffrées et sauvegardées automatiquement', color: 'blue' },
  { icon: 'cloud', title: 'Accessibilité', description: 'Accédez à vos données partout, 24h/24, 7j/7', color: 'purple' },
  { icon: 'support_agent', title: 'Support dédié', description: 'Une équipe à votre écoute pour vous accompagner', color: 'teal' },
  { icon: 'update', title: 'Mises à jour', description: 'Bénéficiez des nouvelles fonctionnalités automatiquement', color: 'red' }
];

const connectFeatures = [
  { icon: 'sync', title: 'Sync Auto', description: 'Synchronisation bidirectionnelle en temps réel', color: 'green' },
  { icon: 'verified', title: 'Certifié', description: 'Connexion sécurisée avec API keys', color: 'blue' },
  { icon: 'devices', title: 'Multi-Device', description: 'Fonctionne avec l\'app WIMRUX FACTURATION', color: 'orange' },
  { icon: 'support', title: 'Support', description: 'Configuration assistée par notre équipe', color: 'purple' }
];

const pricingFeatures = {
  essential: [
    'Facturation illimitée',
    'Jusqu\'à 3 utilisateurs',
    'Gestion clients',
    'Rapports de base',
    'Support email'
  ],
  professional: [
    'Tout Essentiel +',
    'Utilisateurs illimités',
    'Trésorerie complète',
    'Multi-devises',
    'Assistant IA inclus',
    'API Chatbot',
    'Support prioritaire'
  ],
  enterprise: [
    'Tout Professionnel +',
    'Multi-entreprise',
    'Intégrations sur mesure',
    'SLA garanti 99.9%',
    'Formation sur site',
    'Account manager dédié'
  ]
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function handleScroll() {
  scrolled.value = window.scrollY > 50;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.navbar-transparent {
  background: linear-gradient(135deg, #1976d2, #0d47a1) !important;
  transition: all 0.3s ease;
}

.navbar-scrolled {
  background: rgba(25, 118, 210, 0.98) !important;
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero-section {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #1a237e 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(13, 71, 161, 0.92), rgba(25, 118, 210, 0.85));
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  line-height: 1.7;
  max-width: 540px;
}

.hero-stats {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ff9800;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.hero-image {
  max-width: 100%;
  border-radius: 16px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
  animation: bounce 2s infinite;
  z-index: 10;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

.section-padding {
  padding: 6rem 0;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto 2rem;
}

.section-text {
  font-size: 1.125rem;
  color: #555;
  line-height: 1.8;
}

.section-image {
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
}

.features-carousel {
  background: transparent;
  height: auto;
  min-height: 450px;
}

.feature-card-modern {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  height: 100%;
  transition: all 0.3s ease;
}

.feature-card-modern:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.feature-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.benefit-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.compliance-card {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.compliance-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.pricing-card {
  border-radius: 16px;
  height: 100%;
}

.pricing-card-featured {
  background: linear-gradient(135deg, #1976d2, #0d47a1);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 24px 48px rgba(25, 118, 210, 0.3);
}

.cta-section {
  position: relative;
  padding: 6rem 0;
  background: linear-gradient(135deg, #1565c0, #0d47a1);
}

.cta-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(13, 71, 161, 0.95), rgba(25, 118, 210, 0.9));
}

.footer-section {
  background: #1a1a2e;
  padding: 4rem 0 2rem;
  color: white;
}

.footer-title {
  font-weight: 600;
  margin-bottom: 1rem;
  color: white;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

.animate-fade-in-delay {
  animation: fadeIn 0.8s ease-out 0.2s both;
}

.animate-fade-in-delay2 {
  animation: fadeIn 0.8s ease-out 0.4s both;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@media (max-width: 1024px) {
  .hero-title { font-size: 2.5rem; }
  .section-title { font-size: 2rem; }
  .hero-stats { gap: 1.5rem; }
  .stat-number { font-size: 2rem; }
  .benefits-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .hero-title { font-size: 2rem; }
  .section-padding { padding: 3rem 0; }
  .pricing-card-featured { transform: scale(1); }
}
</style>
