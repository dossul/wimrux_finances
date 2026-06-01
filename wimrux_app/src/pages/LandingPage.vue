<template>
  <q-layout>
    <!-- Navbar Transparent -->
    <q-header class="navbar-transparent" :class="{ 'navbar-scrolled': scrolled }">
      <q-toolbar class="container" style="flex-wrap: nowrap; min-height: 56px;">
        <img src="/wimrux_finance_logo.png" alt="W" style="height:36px; width:auto; filter: brightness(0) invert(1);" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bold text-white brand-title">
          WIMRUX<span class="text-orange">®</span> Finances
        </q-toolbar-title>
        <q-space />
        <div class="gt-sm nav-menu" style="display: flex; flex-wrap: nowrap; align-items: center; gap: 0;">
          <q-btn flat dense no-caps label="Fonctionnalités" text-color="white" class="nav-btn" @click="scrollTo('features')" />
          <q-btn flat dense no-caps label="Avantages" text-color="white" class="nav-btn" @click="scrollTo('benefits')" />
          <q-btn flat dense no-caps label="WIMRUX Facturation" text-color="white" class="nav-btn" @click="scrollTo('compliance')" />
          <q-btn flat dense no-caps label="Tarifs" text-color="white" class="nav-btn" @click="scrollTo('pricing')" />
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
        <canvas ref="heroCanvasRef" class="hero-canvas"></canvas>
        <div class="hero-overlay"></div>
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2"></div>
        <div class="hero-content container text-white">
          <div class="row items-center q-col-gutter-xl" style="min-height: 100vh">
            <div class="col-12 col-md-7">
              <q-chip color="orange" text-color="white" icon="trending_up" class="q-mb-lg animate-fade-in">
                ✅ Essai gratuit 30 jours — Aucune carte requise
              </q-chip>

              <h1 class="hero-title animate-fade-in">
                Pilotez votre entreprise.<br />
                <span class="text-orange">Sans perdre de temps.</span>
              </h1>

              <p class="hero-subtitle animate-fade-in-delay">
                <strong>WIMRUX® Finances</strong> centralise tout ce dont vous avez besoin :
                vos factures, votre trésorerie, vos dépenses, vos rapports et votre comptabilité —
                <em>accessible partout, en quelques clics, sans formation.</em>
              </p>

              <div class="hero-cta-group q-mt-xl animate-fade-in-delay2">
                <q-btn
                  color="orange"
                  text-color="white"
                  size="xl"
                  label="Démarrer gratuitement"
                  icon="rocket_launch"
                  unelevated
                  to="/auth/login"
                />
                <q-btn
                  outline
                  color="white"
                  size="xl"
                  label="Voir une démonstration"
                  icon="play_circle"
                  @click="showDemo = true"
                />
              </div>

              <p class="text-caption q-mt-md" style="opacity: 0.7">
                ✓ Aucune carte requise &nbsp;•&nbsp; ✓ Installation en 5 minutes &nbsp;•&nbsp; ✓ Support inclus
              </p>
            </div>

            <div class="col-12 col-md-5 gt-sm">
              <div class="text-center">
                <img
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"
                  alt="Facture électronique"
                  class="hero-image animate-float"
                />
              </div>
              <div class="hero-stats-grid q-mt-lg animate-fade-in-delay2">
                <div class="stat-item">
                  <span class="stat-number">∞</span>
                  <span class="stat-label">Factures illimitées</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">7</span>
                  <span class="stat-label">Moyens de paiement</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">24/7</span>
                  <span class="stat-label">Disponible partout</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">30j</span>
                  <span class="stat-label">Essai gratuit</span>
                </div>
              </div>
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
                Pourquoi choisir WIMRUX® Finances ?
              </q-chip>
              <h2 class="section-title">
                Arrêtez de perdre du temps<br /><span class="text-primary">sur vos tâches financières.</span>
              </h2>
              <p class="section-text">
                Les dirigeants d'entreprise passent en moyenne <strong>8 heures par semaine</strong>
                sur la paperasse financière. WIMRUX® Finances vous rend ce temps —
                en automatisant factures, suivi de caisse, relances et rapports.
              </p>

              <q-list class="q-mt-lg">
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Créez une facture en moins de 2 minutes</q-item-label>
                    <q-item-label caption>Envoyez par email, WhatsApp ou imprimez directement</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Votre argent, visible en temps réel</q-item-label>
                    <q-item-label caption>Banque, caisse, Orange Money, Moov Money — tout en un tableau</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Vos chiffres, à portée de main</q-item-label>
                    <q-item-label caption>Résultats, marges, dettes clients — lisibles sans comptable</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="green" size="28px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Un assistant IA qui répond à vos questions</q-item-label>
                    <q-item-label caption>"Combien j'ai encaissé ce mois ?" — posez la question, obtenez la réponse</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-btn
                color="primary"
                size="lg"
                label="Voir tout ce que vous pouvez faire"
                icon="arrow_forward"
                class="q-mt-lg"
                @click="scrollTo('features')"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURES SECTION -->
      <section id="features" class="section-padding features-section-dark">
        <div class="container text-center">
          <q-chip color="orange" text-color="white" icon="auto_awesome" class="q-mb-md">
            Tout ce que vous pouvez faire avec WIMRUX® Finances
          </q-chip>
          <h2 class="section-title text-white">
            Une seule application.<br />
            <span class="text-orange">Toute votre gestion financière.</span>
          </h2>
          <p class="section-subtitle" style="color: rgba(255,255,255,0.7)">
            Découvrez les interfaces réelles de WIMRUX® Finances — construites pour les entreprises africaines modernes.
          </p>
        </div>

        <!-- SWIPER ZONE — Screenshots défilants -->
        <div class="swiper-section q-mt-xl">
          <div class="swiper" ref="swiperRef">
            <div class="swiper-wrapper">
              <div class="swiper-slide" v-for="screen in appScreens" :key="screen.id">
                <div class="app-screen-card" :style="{ '--accent': screen.accent }">
                  <!-- Browser chrome mock -->
                  <div class="browser-bar">
                    <div class="browser-dots">
                      <span class="dot dot-red"></span>
                      <span class="dot dot-yellow"></span>
                      <span class="dot dot-green"></span>
                    </div>
                    <div class="browser-url">wimrux.app{{ screen.route }}</div>
                  </div>
                  <!-- App UI Mock -->
                  <div class="app-ui" :style="{ background: screen.bg }">
                    <!-- Sidebar mock -->
                    <div class="ui-sidebar">
                      <div class="sidebar-logo">W</div>
                      <div v-for="n in 6" :key="n" class="sidebar-item" :class="{ active: n === screen.activeNav }"></div>
                    </div>
                    <!-- Main content mock -->
                    <div class="ui-main">
                      <!-- Header -->
                      <div class="ui-header">
                        <div class="ui-page-title" :style="{ background: screen.accent }"></div>
                        <div class="ui-header-actions">
                          <div class="ui-btn" :style="{ background: screen.accent }"></div>
                          <div class="ui-avatar"></div>
                        </div>
                      </div>
                      <!-- Content specifique par écran -->
                      <component :is="'div'" class="ui-content" v-html="screen.mockHtml"></component>
                    </div>
                  </div>
                  <!-- Label -->
                  <div class="screen-label">
                    <div class="screen-icon" :style="{ background: screen.accent }">
                      <q-icon :name="screen.icon" size="20px" color="white" />
                    </div>
                    <div>
                      <div class="screen-name">{{ screen.name }}</div>
                      <div class="screen-desc">{{ screen.desc }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Swiper -->
          <div class="swiper-nav q-mt-xl">
            <button class="swiper-nav-btn" ref="prevBtn" aria-label="Précédent">
              <q-icon name="chevron_left" size="28px" />
            </button>
            <div class="swiper-pagination-custom" ref="paginationRef"></div>
            <button class="swiper-nav-btn" ref="nextBtn" aria-label="Suivant">
              <q-icon name="chevron_right" size="28px" />
            </button>
          </div>
        </div>

        <!-- Feature pills sous le slider -->
        <div class="container q-mt-xl">
          <div class="feature-pills">
            <div class="feature-pill" v-for="f in features" :key="f.title">
              <div class="pill-icon" :style="{ background: f.gradient }">
                <q-icon :name="f.icon" size="18px" color="white" />
              </div>
              <span>{{ f.title }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- BENEFITS SECTION -->
      <section id="benefits" class="section-padding bg-dark text-white">
        <div class="container">
          <div class="row items-center q-col-gutter-xl">
            <div class="col-12 col-md-6">
              <q-chip color="orange" text-color="white" icon="trending_up" class="q-mb-md">
                Des résultats concrets dès le premier mois
              </q-chip>
              <h2 class="section-title text-white">
                Ce que vous gagnez<br />
                <span class="text-orange">en utilisant WIMRUX® Finances</span>
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
          <q-chip color="green" text-color="white" icon="verified" class="q-mb-md">
            Conformité fiscale Burkina Faso
          </q-chip>
          <h2 class="section-title">
            Vous exercez au Burkina Faso ?<br />
            <span class="text-green">WIMRUX® Finances est fait pour vous.</span>
          </h2>

          <div class="compliance-badges q-mt-xl">
            <div class="row q-col-gutter-lg justify-center items-stretch">
              <div class="col-6 col-md-3" v-for="c in connectFeatures" :key="c.title" style="display:flex">
                <q-card flat bordered class="compliance-card full-width">
                  <q-card-section class="text-center compliance-card-body">
                    <div class="compliance-icon-wrap" :style="{ color: 'var(--q-' + c.color + ')' }">
                      <q-icon :name="c.icon" size="40px" :color="c.color" />
                    </div>
                    <h4 class="text-weight-bold q-mt-sm q-mb-xs compliance-card-title">{{ c.title }}</h4>
                    <p class="text-caption text-grey-7 compliance-card-desc">{{ c.description }}</p>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <q-card flat bordered class="q-mt-xl q-pa-lg bg-green-1">
            <div class="row items-center">
              <div class="col-12 col-md-8 text-left">
                <h3 class="text-h5 text-weight-bold text-green-9">
                  🇧🇫 Conforme à la réglementation du Burkina Faso
                </h3>
                <p class="text-body2 q-mt-sm">
                  TVA, PSVB, timbre quittance, groupes fiscaux A à P — WIMRUX® Finances gère
                  automatiquement toutes les taxes locales. Connectez WIMRUX FACTURATION
                  pour la certification électronique des factures.
                </p>
              </div>
              <div class="col-12 col-md-4 text-center">
                <q-btn
                  color="green"
                  size="lg"
                  label="Démarrer maintenant"
                  to="/auth/login"
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
            Un abonnement clair.<br />
            <span class="text-primary">Zéro surprise, zéro frais cachés.</span>
          </h2>
          <p class="section-subtitle">
            Choisissez votre formule et démarrez en 5 minutes. Résiliez quand vous voulez.
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
            Votre entreprise mérite mieux<br />qu'un tableur.
          </h2>
          <p class="text-h6 q-mb-xl" style="opacity: 0.9; max-width: 600px; margin: 0 auto">
            Rejoignez les dirigeants qui ont repris le contrôle de leurs finances
            avec WIMRUX® Finances — et qui ne reviendraient pas en arrière.
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
              <div class="q-mb-md flex items-center">
                <img src="/wimrux_finance_logo.png" alt="W" style="height:32px; width:auto; filter: brightness(0) invert(1);" class="q-mr-sm" />
                <span class="text-h6 text-weight-bold text-white">WIMRUX® Finances</span>
              </div>
              <p class="text-body2" style="opacity: 0.7">
                La plateforme de gestion financière pour les entreprises africaines modernes.
                Factures, trésorerie, rapports, taxes — tout en un seul endroit.
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
                © 2026 WIMRUX® Finances. Tous droits réservés. Développé par ILTIC.
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
          <div class="text-white">Démonstration WIMRUX® Finances</div>
          <q-space />
          <q-btn dense flat icon="close" color="white" v-close-popup />
        </q-bar>
        <q-card-section class="flex flex-center" style="height: calc(100vh - 50px)">
          <div class="text-center text-white">
            <q-icon name="play_circle" size="120px" color="orange" />
            <h3 class="q-mt-lg">Vidéo de démonstration</h3>
            <p class="text-grey-5">Découvrez WIMRUX® Finances en action</p>
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
import Swiper from 'swiper';
import { Autoplay, Navigation, Pagination, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

const scrolled = ref(false);
const showDemo = ref(false);
const heroCanvasRef = ref<HTMLCanvasElement | null>(null);
const swiperRef = ref<HTMLElement | null>(null);
const prevBtn = ref<HTMLElement | null>(null);
const nextBtn = ref<HTMLElement | null>(null);
const paginationRef = ref<HTMLElement | null>(null);
let swiperInstance: Swiper | null = null;
let canvasAnimationId: number | null = null;
let canvasResizeHandler: (() => void) | null = null;

// ─── App screens mockés (vraies interfaces WIMRUX) ─────────────────────────
const appScreens = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    desc: 'Vue d\'ensemble de toute votre activité financière',
    route: '/app/dashboard',
    icon: 'dashboard',
    accent: '#1976d2',
    bg: '#f8fafc',
    activeNav: 1,
    mockHtml: `
      <div class="mock-kpis">
        <div class="mock-kpi" style="border-top:3px solid #1976d2"><div class="kpi-val" style="color:#1976d2">12.4M</div><div class="kpi-lbl">Chiffre d'affaires</div></div>
        <div class="mock-kpi" style="border-top:3px solid #43a047"><div class="kpi-val" style="color:#43a047">8.1M</div><div class="kpi-lbl">Encaissements</div></div>
        <div class="mock-kpi" style="border-top:3px solid #fb8c00"><div class="kpi-val" style="color:#fb8c00">3.2M</div><div class="kpi-lbl">Impayés</div></div>
        <div class="mock-kpi" style="border-top:3px solid #8e24aa"><div class="kpi-val" style="color:#8e24aa">5.9M</div><div class="kpi-lbl">Trésorerie</div></div>
      </div>
      <div class="mock-chart-area">
        <div class="mock-chart-title">Évolution mensuelle — 2026</div>
        <div class="mock-bars">
          <div class="mock-bar" style="height:45%;background:#1976d2"></div>
          <div class="mock-bar" style="height:60%;background:#1976d2"></div>
          <div class="mock-bar" style="height:40%;background:#1976d2"></div>
          <div class="mock-bar" style="height:75%;background:#1976d2"></div>
          <div class="mock-bar" style="height:55%;background:#1976d2"></div>
          <div class="mock-bar" style="height:85%;background:#ff9800"></div>
          <div class="mock-bar" style="height:65%;background:#1976d2"></div>
        </div>
        <div class="mock-legend"><span style="background:#1976d2"></span>CA &nbsp;<span style="background:#ff9800"></span>Encaissements</div>
      </div>
    `
  },
  {
    id: 'invoices',
    name: 'Facturation',
    desc: 'Créez et envoyez des factures en 2 minutes',
    route: '/app/invoices',
    icon: 'receipt_long',
    accent: '#0288d1',
    bg: '#f0f7ff',
    activeNav: 2,
    mockHtml: `
      <div class="mock-table">
        <div class="mock-table-header">
          <span>Référence</span><span>Client</span><span>Montant</span><span>Statut</span>
        </div>
        <div class="mock-table-row"><span class="mono">FAC-2026-089</span><span>SATM Sarl</span><span class="amount">845 000 FCFA</span><span class="badge badge-green">Payée</span></div>
        <div class="mock-table-row"><span class="mono">FAC-2026-090</span><span>Bati Plus</span><span class="amount">1 200 000 FCFA</span><span class="badge badge-orange">En attente</span></div>
        <div class="mock-table-row"><span class="mono">FAC-2026-091</span><span>Orange BF</span><span class="amount">320 000 FCFA</span><span class="badge badge-blue">Envoyée</span></div>
        <div class="mock-table-row"><span class="mono">FAC-2026-092</span><span>Coris Bank</span><span class="amount">2 500 000 FCFA</span><span class="badge badge-red">En retard</span></div>
        <div class="mock-table-row"><span class="mono">FAC-2026-093</span><span>Sofitex</span><span class="amount">675 000 FCFA</span><span class="badge badge-green">Payée</span></div>
      </div>
    `
  },
  {
    id: 'treasury',
    name: 'Trésorerie',
    desc: 'Tous vos comptes réunis — banque, caisse, mobile money',
    route: '/app/treasury',
    icon: 'account_balance_wallet',
    accent: '#8e24aa',
    bg: '#fdf6ff',
    activeNav: 3,
    mockHtml: `
      <div class="mock-accounts">
        <div class="mock-account" style="border-left:4px solid #1976d2">
          <div class="acc-name">Coris Bank — Compte courant</div>
          <div class="acc-balance" style="color:#1976d2">4 820 000 FCFA</div>
          <div class="acc-sub">↑ +320 000 ce mois</div>
        </div>
        <div class="mock-account" style="border-left:4px solid #ff9800">
          <div class="acc-name">Orange Money</div>
          <div class="acc-balance" style="color:#ff9800">650 000 FCFA</div>
          <div class="acc-sub">↓ -45 000 ce mois</div>
        </div>
        <div class="mock-account" style="border-left:4px solid #43a047">
          <div class="acc-name">Caisse physique</div>
          <div class="acc-balance" style="color:#43a047">185 000 FCFA</div>
          <div class="acc-sub">Dernière entrée : 15 000</div>
        </div>
        <div class="mock-account" style="border-left:4px solid #0288d1">
          <div class="acc-name">Moov Money</div>
          <div class="acc-balance" style="color:#0288d1">230 000 FCFA</div>
          <div class="acc-sub">↑ +80 000 ce mois</div>
        </div>
      </div>
    `
  },
  {
    id: 'receivables',
    name: 'Créances clients',
    desc: 'Relances automatiques — ne perdez plus un FCFA',
    route: '/app/receivables',
    icon: 'people',
    accent: '#fb8c00',
    bg: '#fffbf0',
    activeNav: 4,
    mockHtml: `
      <div class="mock-aging">
        <div class="mock-chart-title">Balance âgée des créances</div>
        <div class="aging-bars">
          <div class="aging-group"><div class="aging-bar" style="height:30%;background:#43a047"></div><div class="aging-lbl">0-30j<br><small>1.2M</small></div></div>
          <div class="aging-group"><div class="aging-bar" style="height:55%;background:#fb8c00"></div><div class="aging-lbl">31-60j<br><small>2.1M</small></div></div>
          <div class="aging-group"><div class="aging-bar" style="height:25%;background:#e53935"></div><div class="aging-lbl">61-90j<br><small>890K</small></div></div>
          <div class="aging-group"><div class="aging-bar" style="height:40%;background:#b71c1c"></div><div class="aging-lbl">>90j<br><small>1.5M</small></div></div>
        </div>
        <div class="mock-reminder-row"><span class="badge badge-orange">📩 Relance envoyée</span><span>Bati Plus — FAC-090</span><span>1 200 000 FCFA</span></div>
        <div class="mock-reminder-row"><span class="badge badge-red">⚠️ Critique</span><span>Société Diallo — FAC-077</span><span>875 000 FCFA</span></div>
      </div>
    `
  },
  {
    id: 'budgets',
    name: 'Budgets & Dépenses',
    desc: 'Suivez vos budgets et évitez les dépassements',
    route: '/app/budgets',
    icon: 'analytics',
    accent: '#43a047',
    bg: '#f1faf1',
    activeNav: 5,
    mockHtml: `
      <div class="mock-budgets">
        <div class="mock-budget-row">
          <div class="bud-name">Marketing & Communication</div>
          <div class="bud-bar-wrap"><div class="bud-bar" style="width:72%;background:#43a047"></div></div>
          <div class="bud-pct" style="color:#43a047">72%</div>
        </div>
        <div class="mock-budget-row">
          <div class="bud-name">Ressources humaines</div>
          <div class="bud-bar-wrap"><div class="bud-bar" style="width:88%;background:#fb8c00"></div></div>
          <div class="bud-pct" style="color:#fb8c00">88% ⚠️</div>
        </div>
        <div class="mock-budget-row">
          <div class="bud-name">Fournitures de bureau</div>
          <div class="bud-bar-wrap"><div class="bud-bar" style="width:45%;background:#43a047"></div></div>
          <div class="bud-pct" style="color:#43a047">45%</div>
        </div>
        <div class="mock-budget-row">
          <div class="bud-name">Frais de déplacement</div>
          <div class="bud-bar-wrap"><div class="bud-bar" style="width:103%;background:#e53935"></div></div>
          <div class="bud-pct" style="color:#e53935">103% 🔴</div>
        </div>
      </div>
    `
  },
  {
    id: 'ai',
    name: 'Assistant IA',
    desc: 'Posez vos questions financières en français',
    route: '/app/ai',
    icon: 'psychology',
    accent: '#5c6bc0',
    bg: '#f3f4ff',
    activeNav: 6,
    mockHtml: `
      <div class="mock-chat">
        <div class="chat-msg user">Quel est mon bénéfice net ce trimestre ?</div>
        <div class="chat-msg ai">
          <div class="ai-avatar">IA</div>
          <div class="ai-bubble">
            Votre bénéfice net pour le T2 2026 est de <strong>3 245 000 FCFA</strong>,
            soit une progression de <strong>+18%</strong> par rapport au T1.
            Les principales charges sont les RH (42%) et les achats fournisseurs (31%).
          </div>
        </div>
        <div class="chat-msg user">Combien j'ai de factures impayées ?</div>
        <div class="chat-msg ai">
          <div class="ai-avatar">IA</div>
          <div class="ai-bubble">Vous avez <strong>7 factures impayées</strong> pour un total de <strong>5 590 000 FCFA</strong>. Je vous recommande de relancer SATM Sarl en priorité (>90 jours).</div>
        </div>
        <div class="chat-typing"><span></span><span></span><span></span></div>
      </div>
    `
  },
  {
    id: 'reports',
    name: 'Rapports & Analyses',
    desc: 'Vos chiffres exportables en PDF, Excel, CSV',
    route: '/app/reports',
    icon: 'bar_chart',
    accent: '#00897b',
    bg: '#f0faf9',
    activeNav: 2,
    mockHtml: `
      <div class="mock-reports">
        <div class="report-row"><div class="rep-icon" style="background:#1976d2">📊</div><div class="rep-info"><div class="rep-name">Compte de résultat</div><div class="rep-date">Généré le 26 mai 2026</div></div><div class="rep-dl">PDF</div></div>
        <div class="report-row"><div class="rep-icon" style="background:#43a047">💰</div><div class="rep-info"><div class="rep-name">Plan de trésorerie — 3 mois</div><div class="rep-date">Prévisionnel T3 2026</div></div><div class="rep-dl">Excel</div></div>
        <div class="report-row"><div class="rep-icon" style="background:#fb8c00">📋</div><div class="rep-info"><div class="rep-name">Balance âgée clients</div><div class="rep-date">Arrêté au 26/05/2026</div></div><div class="rep-dl">CSV</div></div>
        <div class="report-row"><div class="rep-icon" style="background:#8e24aa">🧾</div><div class="rep-info"><div class="rep-name">Déclaration TVA</div><div class="rep-date">Mai 2026 — à valider</div></div><div class="rep-dl">PDF</div></div>
      </div>
    `
  },
];

const features = [
  {
    icon: 'receipt_long',
    title: 'Facturez en 2 minutes',
    gradient: 'linear-gradient(135deg, #1976d2, #0d47a1)',
    description: 'Créez des factures élégantes et professionnelles sans effort. Vos clients paient plus vite.',
    points: ['Modèles prêts à l\'emploi', 'Envoi par email ou WhatsApp', 'Relances automatiques si impayé']
  },
  {
    icon: 'account_balance_wallet',
    title: 'Votre caisse, vos comptes — en direct',
    gradient: 'linear-gradient(135deg, #8e24aa, #6a1b9a)',
    description: 'Banque, caisse physique, Orange Money, Moov Money — tous vos comptes réunis en un seul endroit.',
    points: ['Solde en temps réel', 'Historique de chaque mouvement', 'Rapprochement bancaire simplifié']
  },
  {
    icon: 'people',
    title: 'Ne perdez plus un seul client',
    gradient: 'linear-gradient(135deg, #fb8c00, #ef6c00)',
    description: 'Toutes vos relations clients et fournisseurs dans un fichier centralisé, avec leur historique complet.',
    points: ['Fiche client avec toutes les factures', 'Suivi des créances et des dettes', 'Alertes de paiement en retard']
  },
  {
    icon: 'analytics',
    title: 'Vos chiffres, lisibles sans comptable',
    gradient: 'linear-gradient(135deg, #00897b, #00695c)',
    description: 'Un tableau de bord clair qui vous montre l\'essentiel : ce que vous gagnez, ce que vous devez, ce qui arrive.',
    points: ['Indicateurs clés en un coup d\'œil', 'Export PDF, Excel, CSV', 'Prévisions de trésorerie sur 3 mois']
  },
  {
    icon: 'trending_up',
    title: 'Gérez vos budgets et dépenses',
    gradient: 'linear-gradient(135deg, #43a047, #2e7d32)',
    description: 'Fixez des budgets par poste, suivez vos dépenses réelles et évitez les dépassements.',
    points: ['Budgets par département', 'Alertes de dépassement', 'Comparaison réel vs prévu']
  },
  {
    icon: 'calculate',
    title: 'Multi-devises sans prise de tête',
    gradient: 'linear-gradient(135deg, #0288d1, #01579b)',
    description: 'Travaillez en XOF, EUR, USD ou GBP. Les conversions sont automatiques.',
    points: ['XOF, EUR, USD, GBP', 'Taux mis à jour automatiquement', 'Rapports par devise']
  },
  {
    icon: 'psychology',
    title: 'Posez vos questions à votre IA',
    gradient: 'linear-gradient(135deg, #5c6bc0, #3949ab)',
    description: 'Interrogez vos finances en français comme vous le feriez avec un collaborateur. Obtenez des réponses instantanées.',
    points: ['"Quel est mon bénéfice ce trimestre ?"', 'Détection automatique des anomalies', 'Conseils personnalisés']
  },
  {
    icon: 'description',
    title: 'Vos emprunts et immobilisations suivis',
    gradient: 'linear-gradient(135deg, #e53935, #c62828)',
    description: 'Prêts bancaires, amortissements, actifs immobilisés — tout est calculé et suivi automatiquement.',
    points: ['Tableau d\'amortissement auto', 'Alertes d\'échéances', 'Valeur nette comptable en direct']
  },
  {
    icon: 'shield',
    title: 'Sécurisé, sauvegardé, fiable',
    gradient: 'linear-gradient(135deg, #78909c, #546e7a)',
    description: 'Vos données sont chiffrées et sauvegardées automatiquement. Gérez qui voit quoi dans votre équipe.',
    points: ['Accès par rôle (admin, comptable, caissier)', 'Historique de toutes les actions', 'Sauvegarde cloud automatique']
  }
];

const benefits = [
  { icon: 'timer', title: '8 heures économisées chaque semaine', description: 'Fini la saisie manuelle, les tableaux Excel et les oublis de relance. Tout est automatique.', color: 'orange' },
  { icon: 'savings', title: 'Récupérez l\'argent qui vous est dû', description: 'Les relances automatiques font remonter le taux de recouvrement de vos factures impayées.', color: 'green' },
  { icon: 'cloud', title: 'Accessible depuis n\'importe où', description: 'Bureau, terrain, domicile — votre gestion financière vous suit sur ordinateur, tablette ou téléphone.', color: 'blue' },
  { icon: 'group', title: 'Toute votre équipe sur la même page', description: 'Attribuez des rôles précis : qui peut voir les salaires, qui peut valider les dépenses, qui peut encaisser.', color: 'purple' },
  { icon: 'support_agent', title: 'Un support humain, pas un bot', description: 'Notre équipe répond à vos questions et vous aide à configurer la plateforme selon votre activité.', color: 'teal' },
  { icon: 'trending_up', title: 'Décidez avec des chiffres fiables', description: 'Fini les décisions à l\'aveugle. Vos indicateurs sont toujours à jour et compréhensibles.', color: 'red' }
];

const connectFeatures = [
  { icon: 'gavel', title: 'TVA & Taxes locales', description: 'PSVB, timbre quittance, groupes fiscaux A à P — calculés automatiquement', color: 'green' },
  { icon: 'receipt', title: 'Factures conformes', description: 'Format légal burkinabè respecté sur chaque document', color: 'blue' },
  { icon: 'link', title: 'Connexion WIMRUX Facturation', description: 'Récupérez vos données de certification DGI directement dans Finance', color: 'orange' },
  { icon: 'support_agent', title: 'Accompagnement local', description: 'Notre équipe connaît la réglementation burkinabè et vous guide', color: 'purple' }
];

const pricingFeatures = {
  essential: [
    'Factures illimitées',
    'Gestion clients & fournisseurs',
    'Suivi des encaissements',
    'Rapports de base',
    '3 utilisateurs inclus',
    'Support par email'
  ],
  professional: [
    'Tout du plan Essentiel',
    'Trésorerie multi-comptes',
    'Orange Money & Moov Money',
    'Budgets & dépenses',
    'Prévisions de trésorerie',
    'Assistant IA intégré',
    'Utilisateurs illimités',
    'Support prioritaire'
  ],
  enterprise: [
    'Tout du plan Professionnel',
    'Plusieurs entreprises',
    'Emprunts & amortissements',
    'Déclarations fiscales',
    'Formation sur site',
    'Gestionnaire de compte dédié',
    'SLA 99.9% garanti'
  ]
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function handleScroll() {
  scrolled.value = window.scrollY > 50;
}

function initHeroCanvas() {
  const canvas = heroCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  canvasResizeHandler = resize;
  window.addEventListener('resize', resize);

  type Particle = { x: number; y: number; vx: number; vy: number; r: number };
  const particles: Particle[] = Array.from({ length: 70 }, () => ({
    x: Math.random() * (canvas.width / dpr),
    y: Math.random() * (canvas.height / dpr),
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.8 + 0.4,
  }));

  let t = 0;
  const animate = () => {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    // Animated grid
    ctx.strokeStyle = 'rgba(255, 152, 0, 0.07)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offset = (t * 0.25) % gridSize;
    for (let x = -offset; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = -offset; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Wavy lines
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255, 152, 0, ${0.18 - i * 0.04})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = h * 0.55 + Math.sin(x * 0.005 + t * 0.012 + i * 1.8) * 70 + i * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Particles + connecting lines
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        if (!a || !b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.globalAlpha = 1 - dist / 130;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 152, 0, 0.7)';
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    t++;
    canvasAnimationId = requestAnimationFrame(animate);
  };
  animate();
}

function initSwiper() {
  if (!swiperRef.value) return;
  swiperInstance = new Swiper(swiperRef.value, {
    modules: [Autoplay, Navigation, Pagination, EffectCoverflow],
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    loop: true,
    coverflowEffect: {
      rotate: 0,
      stretch: 30,
      depth: 180,
      modifier: 1.5,
      slideShadows: true,
    },
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    speed: 700,
    navigation: {
      prevEl: prevBtn.value,
      nextEl: nextBtn.value,
    },
    pagination: {
      el: paginationRef.value,
      clickable: true,
      bulletClass: 'swiper-bullet',
      bulletActiveClass: 'swiper-bullet-active',
      renderBullet: (_: number, className: string) =>
        `<span class="${className}"></span>`,
    },
  });
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  initHeroCanvas();
  initSwiper();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (canvasAnimationId !== null) cancelAnimationFrame(canvasAnimationId);
  if (canvasResizeHandler) window.removeEventListener('resize', canvasResizeHandler);
  swiperInstance?.destroy(true, true);
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
  background: linear-gradient(135deg, #0d47a1 0%, #0b3d8e 50%, #0a1929 100%);
  overflow: hidden;
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(13, 71, 161, 0.55) 0%, rgba(10, 25, 41, 0.85) 100%);
  z-index: 1;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.5;
  z-index: 1;
  pointer-events: none;
}

.hero-glow-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 152, 0, 0.4) 0%, transparent 70%);
  top: -150px;
  right: -100px;
  animation: glowPulse 8s ease-in-out infinite;
}

.hero-glow-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(33, 150, 243, 0.5) 0%, transparent 70%);
  bottom: -100px;
  left: -80px;
  animation: glowPulse 10s ease-in-out infinite reverse;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
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

.brand-title {
  flex: 0 0 auto;
  width: auto;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}

.nav-menu {
  flex-shrink: 0;
  white-space: nowrap;
}

.nav-btn {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 0 10px;
  white-space: nowrap;
}

.hero-cta-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 540px;
}

.hero-cta-group .q-btn {
  flex: 0 0 auto;
}

@media (max-width: 599px) {
  .hero-cta-group {
    justify-content: center;
  }
  .hero-cta-group .q-btn {
    width: 100%;
  }
}

.hero-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1.25rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(8px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
}

@media (max-width: 599px) {
  .hero-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
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

/* ── FEATURES SECTION DARK ─────────────────────────────────────── */
.features-section-dark {
  background: linear-gradient(160deg, #0a1929 0%, #0d3060 50%, #0a1929 100%);
  overflow: hidden;
}

/* ── SWIPER ─────────────────────────────────────────────────────── */
.swiper-section { position: relative; }

.swiper {
  width: 100%;
  padding: 40px 0 60px !important;
  overflow: visible !important;
}

.swiper-wrapper { align-items: center; }

.swiper-slide {
  width: 680px !important;
  max-width: 90vw;
  opacity: 0.45;
  filter: blur(1px);
  transition: opacity 0.5s, filter 0.5s;
}

.swiper-slide-active {
  opacity: 1 !important;
  filter: none !important;
}

/* ── APP SCREEN CARD ────────────────────────────────────────────── */
.app-screen-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.5);
  background: white;
  cursor: grab;
}
.app-screen-card:active { cursor: grabbing; }

.browser-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #1e1e2e;
}
.browser-dots { display: flex; gap: 6px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot-red    { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green  { background: #28c840; }
.browser-url {
  flex: 1;
  background: #2a2a3e;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  font-family: monospace;
}

.app-ui {
  display: flex;
  height: 360px;
  overflow: hidden;
}

.ui-sidebar {
  width: 52px;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
  flex-shrink: 0;
}
.sidebar-logo {
  width: 32px; height: 32px;
  background: #1976d2;
  border-radius: 8px;
  color: white; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; margin-bottom: 8px;
}
.sidebar-item {
  width: 32px; height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.15);
}
.sidebar-item.active { background: #1976d2; }

.ui-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.ui-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
}
.ui-page-title { height: 10px; width: 140px; border-radius: 5px; opacity: 0.8; }
.ui-header-actions { display: flex; align-items: center; gap: 8px; }
.ui-btn { height: 24px; width: 80px; border-radius: 6px; opacity: 0.85; }
.ui-avatar { width: 28px; height: 28px; border-radius: 50%; background: #1976d2; }

.ui-content { flex: 1; overflow: hidden; padding: 12px 14px; font-size: 11px; }

/* ── MOCK: KPIs ─────────────────────────────────────────────────── */
:deep(.mock-kpis) {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 7px; margin-bottom: 10px;
}
:deep(.mock-kpi) {
  background: white; border-radius: 8px;
  padding: 7px; box-shadow: 0 2px 6px rgba(0,0,0,0.07); text-align: center;
}
:deep(.kpi-val) { font-size: 14px; font-weight: 700; }
:deep(.kpi-lbl) { font-size: 9px; color: #888; margin-top: 2px; }
:deep(.mock-chart-area) {
  background: white; border-radius: 8px;
  padding: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.07);
}
:deep(.mock-chart-title) { font-size: 10px; font-weight: 600; color: #333; margin-bottom: 8px; }
:deep(.mock-bars) { display: flex; align-items: flex-end; gap: 5px; height: 75px; }
:deep(.mock-bar) { flex: 1; border-radius: 3px 3px 0 0; min-height: 6px; }
:deep(.mock-legend) { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 9px; color: #666; }
:deep(.mock-legend span) { display: inline-block; width: 10px; height: 6px; border-radius: 2px; }

/* ── MOCK: Table ────────────────────────────────────────────────── */
:deep(.mock-table) { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.07); }
:deep(.mock-table-header) {
  display: grid; grid-template-columns: 1.4fr 1.2fr 1.2fr 0.8fr;
  padding: 7px 10px; background: #f8fafc;
  font-size: 9px; font-weight: 600; color: #666; border-bottom: 1px solid #eee;
}
:deep(.mock-table-row) {
  display: grid; grid-template-columns: 1.4fr 1.2fr 1.2fr 0.8fr;
  padding: 7px 10px; font-size: 10px; border-bottom: 1px solid #f5f5f5;
  align-items: center;
}
:deep(.mock-table-row:last-child) { border-bottom: none; }
:deep(.mono) { font-family: monospace; font-size: 10px; }
:deep(.amount) { font-weight: 600; color: #333; }
:deep(.badge) { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; display: inline-block; }
:deep(.badge-green)  { background: #e8f5e9; color: #2e7d32; }
:deep(.badge-orange) { background: #fff3e0; color: #e65100; }
:deep(.badge-blue)   { background: #e3f2fd; color: #1565c0; }
:deep(.badge-red)    { background: #ffebee; color: #c62828; }

/* ── MOCK: Accounts ─────────────────────────────────────────────── */
:deep(.mock-accounts) { display: flex; flex-direction: column; gap: 8px; }
:deep(.mock-account) {
  background: white; border-radius: 8px; padding: 9px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.07);
}
:deep(.acc-name) { font-size: 10px; color: #555; margin-bottom: 3px; }
:deep(.acc-balance) { font-size: 15px; font-weight: 700; }
:deep(.acc-sub) { font-size: 9px; color: #999; margin-top: 2px; }

/* ── MOCK: Aging ─────────────────────────────────────────────────── */
:deep(.mock-aging) { background: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.07); }
:deep(.aging-bars) { display: flex; align-items: flex-end; gap: 16px; height: 80px; margin: 10px 0; justify-content: center; }
:deep(.aging-group) { display: flex; flex-direction: column; align-items: center; gap: 4px; }
:deep(.aging-bar) { width: 36px; border-radius: 4px 4px 0 0; min-height: 6px; }
:deep(.aging-lbl) { font-size: 9px; text-align: center; color: #555; line-height: 1.3; }
:deep(.mock-reminder-row) {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 0; border-top: 1px solid #f5f5f5; font-size: 10px; color: #444;
}

/* ── MOCK: Budgets ───────────────────────────────────────────────── */
:deep(.mock-budgets) { display: flex; flex-direction: column; gap: 10px; }
:deep(.mock-budget-row) { display: flex; align-items: center; gap: 8px; font-size: 10px; }
:deep(.bud-name) { width: 160px; flex-shrink: 0; color: #444; }
:deep(.bud-bar-wrap) { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
:deep(.bud-bar) { height: 100%; border-radius: 4px; max-width: 100%; }
:deep(.bud-pct) { width: 70px; text-align: right; font-weight: 600; font-size: 10px; }

/* ── MOCK: Chat ─────────────────────────────────────────────────── */
:deep(.mock-chat) { display: flex; flex-direction: column; gap: 8px; }
:deep(.chat-msg) { display: flex; gap: 6px; }
:deep(.chat-msg.user) {
  justify-content: flex-end;
}
:deep(.chat-msg.user > *),
:deep(.chat-msg.user::before) {
  background: #1976d2; color: white;
  padding: 6px 10px; border-radius: 12px 12px 2px 12px;
  font-size: 10px; max-width: 75%;
  content: attr(class); display: block;
}
:deep(.chat-msg.user) {
  background: #1976d2; color: white;
  padding: 6px 10px; border-radius: 12px 12px 2px 12px;
  font-size: 10px; max-width: 75%; align-self: flex-end;
  display: block;
}
:deep(.chat-msg.ai) { display: flex; gap: 6px; align-items: flex-start; }
:deep(.ai-avatar) {
  width: 22px; height: 22px; border-radius: 50%;
  background: #5c6bc0; color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 700; flex-shrink: 0;
}
:deep(.ai-bubble) {
  background: #f3f4ff; color: #333;
  padding: 6px 10px; border-radius: 2px 12px 12px 12px;
  font-size: 10px; max-width: 80%; line-height: 1.4;
}
:deep(.chat-typing) { display: flex; gap: 4px; padding: 4px 6px; }
:deep(.chat-typing span) {
  width: 6px; height: 6px; border-radius: 50%; background: #5c6bc0;
  animation: typingDot 1.2s infinite;
}
:deep(.chat-typing span:nth-child(2)) { animation-delay: 0.2s; }
:deep(.chat-typing span:nth-child(3)) { animation-delay: 0.4s; }
@keyframes typingDot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* ── MOCK: Reports ──────────────────────────────────────────────── */
:deep(.mock-reports) { display: flex; flex-direction: column; gap: 8px; }
:deep(.report-row) {
  display: flex; align-items: center; gap: 10px;
  background: white; border-radius: 8px; padding: 9px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.07);
}
:deep(.rep-icon) {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
:deep(.rep-info) { flex: 1; }
:deep(.rep-name) { font-size: 11px; font-weight: 600; color: #333; }
:deep(.rep-date) { font-size: 9px; color: #888; }
:deep(.rep-dl) {
  font-size: 9px; font-weight: 700; color: #1976d2;
  border: 1px solid #1976d2; border-radius: 4px; padding: 2px 6px;
}

/* ── SCREEN LABEL ────────────────────────────────────────────────── */
.screen-label {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  background: #0f172a;
}
.screen-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.screen-name { font-size: 14px; font-weight: 700; color: white; }
.screen-desc { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 1px; }

/* ── SWIPER NAV ──────────────────────────────────────────────────── */
.swiper-nav {
  display: flex; align-items: center; justify-content: center; gap: 20px;
}
.swiper-nav-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: white; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.2s;
}
.swiper-nav-btn:hover { background: rgba(255,255,255,0.2); }

.swiper-pagination-custom { display: flex; gap: 8px; align-items: center; }
:deep(.swiper-bullet) {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.3s;
  display: inline-block;
}
:deep(.swiper-bullet-active) {
  width: 24px; border-radius: 4px; background: #ff9800;
}

/* ── FEATURE PILLS ───────────────────────────────────────────────── */
.feature-pills {
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
}
.feature-pill {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 100px; padding: 6px 14px 6px 8px;
  color: rgba(255,255,255,0.85); font-size: 12px;
  transition: background 0.2s;
}
.feature-pill:hover { background: rgba(255,255,255,0.12); }
.pill-icon {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
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
  display: flex;
  flex-direction: column;
}

.compliance-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.compliance-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 24px 16px !important;
}

.compliance-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.compliance-card-title {
  font-size: 0.95rem;
  line-height: 1.3;
  min-height: 2.6em;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-top: 12px !important;
  margin-bottom: 8px !important;
}

.compliance-card-desc {
  font-size: 0.78rem;
  line-height: 1.5;
  color: #666;
  text-align: center;
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
  .hero-stats-grid { gap: 0.75rem; padding: 1rem 0.75rem; }
  .stat-number { font-size: 1.75rem; }
  .benefits-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .hero-title { font-size: 2rem; }
  .section-padding { padding: 3rem 0; }
  .pricing-card-featured { transform: scale(1); }
}
</style>
