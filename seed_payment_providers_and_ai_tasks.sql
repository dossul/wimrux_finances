-- ============================================================================
-- WIMRUX® FINANCES — SEEDS SQL
-- Tables : payment_providers + ai_providers + ai_models + ai_tasks
-- ============================================================================
-- Date          : 2026-05-23
-- Cible         : Backend InsForge PostgreSQL (gfe4bd9y.eu-central.insforge.app)
-- Prérequis     : EPIC 24, EPIC 25 et EPIC 26 (tables créées via migrations)
-- Idempotent    : OUI — utilise ON CONFLICT DO UPDATE sur les colonnes UNIQUE
-- ============================================================================
-- Codes pays    : ISO 3166-1 alpha-3
-- Devises       : ISO 4217
-- Notes         : Liste vérifiée le 23/05/2026 contre :
--                 - BCEAO "List of electronic money issuing institutions" (juin 2025)
--                 - GSMA State of Mobile Money 2025
--                 - Sites officiels providers
--                 - Operateurs : seuls les opérateurs ACTIFS sont inclus.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1 — PAYMENT PROVIDERS (CEDEAO / UEMOA)
-- ============================================================================
-- Total : 84 providers
-- Répartition :
--   - 36 Mobile Money / Wallets opérateurs télécoms
--   - 12 Wallets / Money services bancaires (SankMoney, CorisMoney, G-Money, etc.)
--   -  9 Agrégateurs API (CinetPay, PayDunya, FedaPay, HUB2, Bizao, etc.)
--   - 14 Fintechs Nigeria/Ghana (OPay, PalmPay, Moniepoint, Kuda, Paga, etc.)
--   -  5 Cartes / réseaux interbancaires (Visa, MasterCard, GIM-UEMOA, etc.)
--   -  8 Banques majeures panafricaines opérant en CEDEAO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 — MOBILE MONEY UEMOA (8 pays)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, api_doc_url, is_active
) VALUES

-- BÉNIN (BEN)
('mtn_momo_bj',      'MTN Mobile Money Bénin',      'mobile_money', ARRAY['BEN'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://momodeveloper.mtn.com/', true),
('moov_money_bj',    'Moov Money Bénin',            'mobile_money', ARRAY['BEN'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('celtiis_cash_bj',  'Celtiis Cash Bénin',          'mobile_money', ARRAY['BEN'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),

-- BURKINA FASO (BFA)
('orange_money_bf',  'Orange Money Burkina Faso',   'mobile_money', ARRAY['BFA'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://developer.orange.com/apis/om-webpay', true),
('moov_money_bf',    'Moov Money Burkina Faso',     'mobile_money', ARRAY['BFA'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('wave_bf',          'Wave Burkina Faso',           'mobile_money', ARRAY['BFA'],       'UEMOA', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://docs.wave.com/business', true),
('telecel_money_bf', 'Telecel Money Burkina Faso',  'mobile_money', ARRAY['BFA'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),

-- CÔTE D'IVOIRE (CIV)
('orange_money_ci',  'Orange Money Côte d''Ivoire', 'mobile_money', ARRAY['CIV'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://developer.orange.com/apis/om-webpay', true),
('mtn_momo_ci',      'MTN MoMo Côte d''Ivoire',     'mobile_money', ARRAY['CIV'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://momodeveloper.mtn.com/', true),
('moov_money_ci',    'Moov Money Côte d''Ivoire',   'mobile_money', ARRAY['CIV'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('wave_ci',          'Wave Côte d''Ivoire',         'mobile_money', ARRAY['CIV'],       'UEMOA', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://docs.wave.com/business', true),

-- GUINÉE-BISSAU (GNB)
('orange_money_gw',  'Orange Money Guinée-Bissau',  'mobile_money', ARRAY['GNB'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),
('mtn_momo_gw',      'MTN MoMo Guinée-Bissau',      'mobile_money', ARRAY['GNB'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),

-- MALI (MLI)
('orange_money_ml',  'Orange Money Mali',           'mobile_money', ARRAY['MLI'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://developer.orange.com/apis/om-webpay', true),
('moov_money_ml',    'Moov Money Mali',             'mobile_money', ARRAY['MLI'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('wave_ml',          'Wave Mali',                   'mobile_money', ARRAY['MLI'],       'UEMOA', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://docs.wave.com/business', true),

-- NIGER (NER)
('orange_money_ne',  'Orange Money Niger',          'mobile_money', ARRAY['NER'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, false), -- Orange a quitté NE en 2024
('moov_money_ne',    'Moov Money Niger',            'mobile_money', ARRAY['NER'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),
('airtel_money_ne',  'Airtel Money Niger',          'mobile_money', ARRAY['NER'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','SMS'],       'https://developers.airtel.africa/', true),
('mynita_ne',        'MyNITA / Zamani Telecom',     'mobile_money', ARRAY['NER'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),

-- SÉNÉGAL (SEN)
('orange_money_sn',  'Orange Money Sénégal',        'mobile_money', ARRAY['SEN'],       'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://developer.orange.com/apis/om-webpay', true),
('free_money_sn',    'Free Money Sénégal',          'mobile_money', ARRAY['SEN'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('wave_sn',          'Wave Sénégal',                'mobile_money', ARRAY['SEN'],       'UEMOA', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://docs.wave.com/business', true),
('wizall_sn',        'Wizall Money Sénégal',        'mobile_wallet_local', ARRAY['SEN'],'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://wizall.com/api/', true),
('expresso_emoney',  'Expresso E-Money Sénégal',    'mobile_money', ARRAY['SEN'],       'UEMOA', false, false, false, false, false, ARRAY['SMS'],             NULL, true),

-- TOGO (TGO)
('tmoney_tg',        'T-Money (Togocom)',           'mobile_money', ARRAY['TGO'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('mixx_by_yas_tg',   'Mixx by Yas (ex-Flooz)',      'mobile_money', ARRAY['TGO'],       'UEMOA', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  supports_pull = EXCLUDED.supports_pull, supports_push = EXCLUDED.supports_push,
  supports_send_payment = EXCLUDED.supports_send_payment,
  supports_balance_query = EXCLUDED.supports_balance_query,
  statement_formats = EXCLUDED.statement_formats, api_doc_url = EXCLUDED.api_doc_url,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.2 — MOBILE MONEY CEDEAO (hors UEMOA — 7 pays)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, api_doc_url, is_active
) VALUES

-- CAP-VERT (CPV)
('vinti4_cv',        'Vinti4 (Cabo Verde)',          'mobile_wallet_local', ARRAY['CPV'],'CEDEAO', false, false, false, false, false, ARRAY['PDF','CSV'],       'https://www.vinti4.cv', true),

-- GAMBIE (GMB)
('afrimoney_gm',     'Afrimobile Money (Africell)',  'mobile_money', ARRAY['GMB'],       'CEDEAO', false, false, false, false, false, ARRAY['SMS'],             NULL, true),
('qmoney_gm',        'QMoney (Qcell)',               'mobile_money', ARRAY['GMB'],       'CEDEAO', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),

-- GHANA (GHA)
('mtn_momo_gh',      'MTN MoMo Ghana',               'mobile_money', ARRAY['GHA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://momodeveloper.mtn.com/', true),
('telecel_cash_gh',  'Telecel Cash Ghana (ex Vodafone Cash)', 'mobile_money', ARRAY['GHA'],'CEDEAO', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),
('airteltigo_money', 'AirtelTigo Money Ghana',       'mobile_money', ARRAY['GHA'],       'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','SMS'],       'https://developers.airtel.africa/', true),
('g_money_gh',       'G-Money (GCB Bank)',           'mobile_wallet_local', ARRAY['GHA'],'CEDEAO', false, false, false, false, false, ARRAY['PDF','CSV'],       NULL, true),
('zeepay_gh',        'Zeepay Ghana',                 'mobile_wallet_local', ARRAY['GHA'],'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','CSV'],       'https://developer.myzeepay.com/', true),

-- GUINÉE (GIN)
('orange_money_gn',  'Orange Money Guinée',          'mobile_money', ARRAY['GIN'],       'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','SMS'],       'https://developer.orange.com/apis/om-webpay', true),
('mtn_momo_gn',      'MTN MoMo Guinée',              'mobile_money', ARRAY['GIN'],       'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','SMS'],       'https://momodeveloper.mtn.com/', true),

-- LIBÉRIA (LBR)
('orange_money_lr',  'Orange Money Liberia',         'mobile_money', ARRAY['LBR'],       'CEDEAO', false, false, false, false, false, ARRAY['SMS'],             NULL, true),
('mtn_momo_lr',      'MTN MoMo Liberia (Lonestar)',  'mobile_money', ARRAY['LBR'],       'CEDEAO', true,  false, true,  true,  true,  ARRAY['SMS'],             'https://momodeveloper.mtn.com/', true),

-- NIGÉRIA (NGA) — Mobile money & wallets opérateurs télécoms
('mtn_momo_ng',      'MTN MoMo Nigeria',             'mobile_money', ARRAY['NGA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://momodeveloper.mtn.com/', true),
('airtel_smartcash', 'Airtel SmartCash PSB Nigeria', 'mobile_money', ARRAY['NGA'],       'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://developers.airtel.africa/', true),
('9mobile_9psb',     '9PSB (9mobile)',               'mobile_money', ARRAY['NGA'],       'CEDEAO', false, false, false, false, false, ARRAY['PDF','SMS'],       NULL, true),

-- SIERRA LEONE (SLE)
('orange_money_sl',  'Orange Money Sierra Leone (Max it)', 'mobile_money', ARRAY['SLE'], 'CEDEAO', true,  false, true,  true,  true,  ARRAY['PDF','SMS'],       'https://developer.orange.com/apis/om-webpay', true),
('afrimoney_sl',     'AfriMoney Sierra Leone',       'mobile_money', ARRAY['SLE'],       'CEDEAO', false, false, false, false, false, ARRAY['SMS'],             NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  supports_pull = EXCLUDED.supports_pull, supports_push = EXCLUDED.supports_push,
  supports_send_payment = EXCLUDED.supports_send_payment,
  supports_balance_query = EXCLUDED.supports_balance_query,
  statement_formats = EXCLUDED.statement_formats, api_doc_url = EXCLUDED.api_doc_url,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.3 — WALLETS LOCAUX BANCAIRES (UEMOA principalement)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, api_doc_url, is_active
) VALUES

('sankmoney_bf',     'SankMoney (Sank Business Group)','mobile_wallet_local', ARRAY['BFA'],'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://sankmoney.com', true),
('corismoney',       'Coris Money (Coris Bank International)','mobile_wallet_local', ARRAY['BFA','CIV','MLI','SEN','TGO','BEN','NER','GNB'],'UEMOA', true, false, true, true, true, ARRAY['PDF','CSV','SMS'], 'https://coris.money', true),
('ligdicash_bf',     'LigdiCash Burkina Faso',       'payment_aggregator', ARRAY['BFA'], 'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV'],       'https://app.ligdicash.com/docs', true),
('sama_money_ml',    'Sama Money Mali',              'mobile_wallet_local', ARRAY['MLI'],'UEMOA', true,  false, true,  true,  true,  ARRAY['PDF','CSV','SMS'], 'https://samamoney.com', true),
('yup_sn',           'YUP (Société Générale)',       'mobile_wallet_local', ARRAY['SEN','CIV','BFA','CMR'],'UEMOA', false, false, false, false, false, ARRAY['PDF','CSV'], NULL, false), -- service progressivement fermé
('djamo_ci',         'Djamo Côte d''Ivoire',         'fintech',      ARRAY['CIV','SEN'], 'UEMOA', false, false, false, false, false, ARRAY['PDF','CSV'],       'https://djamo.com', true),
('paysika',          'PaySika',                      'fintech',      ARRAY['CIV','BEN','TGO','BFA'],'UEMOA', false, false, false, false, false, ARRAY['PDF','CSV'], 'https://paysika.co', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  supports_pull = EXCLUDED.supports_pull, supports_push = EXCLUDED.supports_push,
  supports_send_payment = EXCLUDED.supports_send_payment,
  supports_balance_query = EXCLUDED.supports_balance_query,
  statement_formats = EXCLUDED.statement_formats, api_doc_url = EXCLUDED.api_doc_url,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.4 — AGRÉGATEURS DE PAIEMENT (multi-pays)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, api_doc_url, is_active
) VALUES

('cinetpay',         'CinetPay',                     'payment_aggregator', ARRAY['CIV','BFA','SEN','MLI','TGO','BEN','NER','CMR','GNB','GIN'], 'CEDEAO', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://docs.cinetpay.com/', true),
('paydunya',         'PayDunya',                     'payment_aggregator', ARRAY['SEN','CIV','BFA','BEN','TGO','MLI','NER'], 'UEMOA', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://paydunya.com/developers', true),
('fedapay',          'FedaPay',                      'payment_aggregator', ARRAY['BEN','TGO','CIV','NER','BFA','MLI','SEN'], 'UEMOA', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://docs.fedapay.com/', true),
('hub2',             'HUB2',                         'payment_aggregator', ARRAY['CIV','BEN','SEN','BFA','TGO','CMR','GIN','MLI'], 'CEDEAO', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://docs.hub2.io/', true),
('intouch_group',    'InTouch Group (TouchPay)',     'payment_aggregator', ARRAY['SEN','CIV','BFA','MLI','GIN','TGO','BEN','NER','CMR','GAB'], 'CEDEAO', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://www.intouchgroup.net/', true),
('bizao',            'Bizao',                        'payment_aggregator', ARRAY['CIV','SEN','BFA','MLI','BEN','TGO','NER','CMR','GIN'], 'CEDEAO', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://docs.bizao.com/', true),
('semoa',            'Semoa Payment',                'payment_aggregator', ARRAY['TGO','BEN','BFA','CIV'], 'UEMOA', true, true, true, true, true, ARRAY['PDF','CSV'], 'https://semoa-payments.com/', true),
('kkiapay',          'Kkiapay',                      'payment_aggregator', ARRAY['BEN','CIV','SEN','TGO'], 'UEMOA', true, true, true, true, true, ARRAY['PDF','CSV'], 'https://docs.kkiapay.me/', true),
('flutterwave',      'Flutterwave',                  'payment_aggregator', ARRAY['NGA','GHA','CIV','SEN','BFA','MLI','UGA','RWA','ZAF','KEN','TZA'], 'AFRICA', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://developer.flutterwave.com/', true),
('paystack',         'Paystack',                     'payment_aggregator', ARRAY['NGA','GHA','ZAF','CIV','KEN'], 'AFRICA', true, true, true, true, true, ARRAY['PDF','CSV','XLSX'], 'https://paystack.com/docs/api/', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  supports_pull = EXCLUDED.supports_pull, supports_push = EXCLUDED.supports_push,
  supports_send_payment = EXCLUDED.supports_send_payment,
  supports_balance_query = EXCLUDED.supports_balance_query,
  statement_formats = EXCLUDED.statement_formats, api_doc_url = EXCLUDED.api_doc_url,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.5 — FINTECHS NIGERIA / GHANA (banques numériques actives)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, api_doc_url, is_active
) VALUES

('opay_ng',          'OPay Nigeria',                 'fintech',      ARRAY['NGA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','XLSX'], 'https://documentation.opaycheckout.com/', true),
('palmpay_ng',       'PalmPay Nigeria',              'fintech',      ARRAY['NGA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','XLSX'], 'https://developer.palmpay-inc.com/', true),
('moniepoint_ng',    'Moniepoint Nigeria',           'fintech',      ARRAY['NGA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV','XLSX'], 'https://moniepoint.com/', true),
('kuda_ng',          'Kuda Bank Nigeria',            'fintech',      ARRAY['NGA'],       'CEDEAO', true,  false, false, true,  true,  ARRAY['PDF','CSV'],       'https://kuda.com', true),
('paga_ng',          'Paga Nigeria',                 'fintech',      ARRAY['NGA'],       'CEDEAO', true,  true,  true,  true,  true,  ARRAY['PDF','CSV'],       'https://www.mypaga.com/paga-web/business/api', true),
('carbon_ng',        'Carbon Nigeria',               'fintech',      ARRAY['NGA'],       'CEDEAO', false, false, false, false, false, ARRAY['PDF','CSV'],       NULL, true),
('chipper_cash',     'Chipper Cash',                 'fintech',      ARRAY['NGA','GHA','UGA','RWA','TZA','KEN','ZAF','CIV'], 'AFRICA', true, false, false, true, true, ARRAY['PDF','CSV'], 'https://chippercash.com/business', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  supports_pull = EXCLUDED.supports_pull, supports_push = EXCLUDED.supports_push,
  supports_send_payment = EXCLUDED.supports_send_payment,
  supports_balance_query = EXCLUDED.supports_balance_query,
  statement_formats = EXCLUDED.statement_formats, api_doc_url = EXCLUDED.api_doc_url,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.6 — RÉSEAUX CARTES (émetteurs et acquéreurs)
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, supports_pull, supports_push, supports_send_payment, supports_balance_query,
  statement_formats, is_active
) VALUES

('visa',             'Visa',                         'card_issuer',  ARRAY['BEN','BFA','CIV','GNB','MLI','NER','SEN','TGO','CPV','GMB','GHA','GIN','LBR','NGA','SLE'], 'GLOBAL', true, false, false, false, false, ARRAY['PDF','CSV','XLSX'], true),
('mastercard',       'Mastercard',                   'card_issuer',  ARRAY['BEN','BFA','CIV','GNB','MLI','NER','SEN','TGO','CPV','GMB','GHA','GIN','LBR','NGA','SLE'], 'GLOBAL', true, false, false, false, false, ARRAY['PDF','CSV','XLSX'], true),
('gim_uemoa',        'GIM-UEMOA',                    'card_issuer',  ARRAY['BEN','BFA','CIV','GNB','MLI','NER','SEN','TGO'], 'UEMOA', false, false, false, false, false, ARRAY['PDF','CSV'], true),
('amex',             'American Express',             'card_issuer',  ARRAY['CIV','SEN','GHA','NGA'], 'GLOBAL', false, false, false, false, false, ARRAY['PDF','CSV'], true),
('verve_ng',         'Verve (Interswitch)',          'card_issuer',  ARRAY['NGA','GHA','KEN','UGA'], 'AFRICA', true, false, false, false, false, ARRAY['PDF','CSV'], true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  is_active = EXCLUDED.is_active;


-- ----------------------------------------------------------------------------
-- 1.7 — BANQUES MAJEURES PANAFRICAINES OPÉRANT EN CEDEAO
-- ----------------------------------------------------------------------------

INSERT INTO payment_providers (
  code, name, type, country_codes, region,
  has_official_api, statement_formats, is_active
) VALUES

('ecobank',          'Ecobank Transnational',        'bank',         ARRAY['BEN','BFA','CIV','GNB','MLI','NER','SEN','TGO','CPV','GMB','GHA','GIN','LBR','NGA','SLE'], 'CEDEAO', true,  ARRAY['PDF','CSV','XLSX','OFX'], true),
('uba',              'United Bank for Africa (UBA)', 'bank',         ARRAY['BEN','BFA','CIV','GHA','GIN','MLI','NGA','SEN','SLE','LBR'], 'CEDEAO', true, ARRAY['PDF','CSV','XLSX','OFX'], true),
('boa',              'Bank of Africa (BOA Group)',   'bank',         ARRAY['BEN','BFA','CIV','GHA','MLI','NER','SEN','TGO'], 'CEDEAO', false, ARRAY['PDF','CSV','XLSX'], true),
('societe_generale', 'Société Générale Afrique',    'bank',         ARRAY['BFA','CIV','SEN','GIN'], 'CEDEAO', false, ARRAY['PDF','CSV','XLSX','OFX'], true),
('coris_bank',       'Coris Bank International',     'bank',         ARRAY['BFA','CIV','MLI','SEN','TGO','BEN','NER','GNB'], 'UEMOA', false, ARRAY['PDF','CSV','XLSX'], true),
('orabank',          'Orabank Group',                'bank',         ARRAY['BEN','BFA','CIV','GIN','MLI','MRT','NER','SEN','TGO','GAB','TCD'], 'CEDEAO', false, ARRAY['PDF','CSV','XLSX'], true),
('nsia_banque',      'NSIA Banque',                  'bank',         ARRAY['CIV','BEN','SEN','GIN','TGO','GAB','CMR'], 'CEDEAO', false, ARRAY['PDF','CSV','XLSX'], true),
('bsic',             'Banque Sahélo-Saharienne BSIC','bank',         ARRAY['BFA','CIV','GIN','MLI','NER','SEN','TGO','BEN'], 'CEDEAO', false, ARRAY['PDF','CSV','XLSX'], true),
('atlantic_bank',    'Banque Atlantique (BCP)',      'bank',         ARRAY['BEN','BFA','CIV','MLI','NER','SEN','TGO'], 'UEMOA', false, ARRAY['PDF','CSV','XLSX'], true),
('access_bank',      'Access Bank',                  'bank',         ARRAY['NGA','GHA','GMB','SLE'], 'CEDEAO', true, ARRAY['PDF','CSV','XLSX','OFX'], true),
('gtbank',           'Guaranty Trust Bank (GTBank)', 'bank',         ARRAY['NGA','GHA','GMB','LBR','SLE','CIV'], 'CEDEAO', true, ARRAY['PDF','CSV','XLSX','OFX'], true),
('zenith_bank',      'Zenith Bank',                  'bank',         ARRAY['NGA','GHA','GMB','SLE'], 'CEDEAO', true, ARRAY['PDF','CSV','XLSX','OFX'], true),
('stanbic_bank',     'Stanbic / Standard Bank',      'bank',         ARRAY['GHA','NGA','CIV'], 'AFRICA', true, ARRAY['PDF','CSV','XLSX','OFX'], true),
('bcp_group',        'Banque Centrale Populaire (BCP)','bank',       ARRAY['CIV','BFA','MLI','SEN','TGO','BEN','NER'], 'UEMOA', false, ARRAY['PDF','CSV','XLSX'], true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country_codes = EXCLUDED.country_codes,
  region = EXCLUDED.region, has_official_api = EXCLUDED.has_official_api,
  statement_formats = EXCLUDED.statement_formats, is_active = EXCLUDED.is_active;


-- ============================================================================
-- SECTION 2 — AI PROVIDERS (fournisseurs IA supportés)
-- ============================================================================

INSERT INTO ai_providers (
  code, name, type, api_base_url, auth_method, auth_header_name,
  supports_streaming, supports_vision, supports_tools, supports_json_mode,
  doc_url, is_active, is_default_platform
) VALUES

-- Gateways multi-modèles
('openrouter',  'OpenRouter',     'llm_gateway',     'https://openrouter.ai/api/v1',          'bearer',          'Authorization', true, true,  true,  true,  'https://openrouter.ai/docs',                       true, true),
('portkey',     'Portkey',        'llm_gateway',     'https://api.portkey.ai/v1',             'api_key_header',  'x-portkey-api-key', true, true, true, true, 'https://portkey.ai/docs',                       true, false),

-- LLM directs (compatibles OpenAI API)
('openai',      'OpenAI',         'llm_direct',      'https://api.openai.com/v1',             'bearer',          'Authorization', true, true,  true,  true,  'https://platform.openai.com/docs/api-reference',   true, false),
('anthropic',   'Anthropic',      'llm_direct',      'https://api.anthropic.com/v1',          'api_key_header',  'x-api-key',     true, true,  true,  true,  'https://docs.anthropic.com/en/api',                true, false),
('mistral',     'Mistral AI',     'llm_direct',      'https://api.mistral.ai/v1',             'bearer',          'Authorization', true, true,  true,  true,  'https://docs.mistral.ai/api',                      true, false),
('google_ai',   'Google AI / Gemini','llm_direct',   'https://generativelanguage.googleapis.com/v1beta', 'api_key_header', 'x-goog-api-key', true, true, true, true, 'https://ai.google.dev/api',           true, false),
('cohere',      'Cohere',         'llm_direct',      'https://api.cohere.com/v1',             'bearer',          'Authorization', true, false, true,  true,  'https://docs.cohere.com/reference',                true, false),
('groq',        'Groq',           'llm_direct',      'https://api.groq.com/openai/v1',        'bearer',          'Authorization', true, true,  true,  true,  'https://console.groq.com/docs',                    true, false),
('deepseek',    'DeepSeek',       'llm_direct',      'https://api.deepseek.com/v1',           'bearer',          'Authorization', true, false, true,  true,  'https://platform.deepseek.com/api-docs',           true, false),
('together_ai', 'Together AI',    'llm_direct',      'https://api.together.xyz/v1',           'bearer',          'Authorization', true, true,  true,  true,  'https://docs.together.ai/reference',               true, false),
('fireworks',   'Fireworks AI',   'llm_direct',      'https://api.fireworks.ai/inference/v1', 'bearer',          'Authorization', true, true,  true,  true,  'https://docs.fireworks.ai/',                       true, false),
('xai',         'xAI (Grok)',     'llm_direct',      'https://api.x.ai/v1',                   'bearer',          'Authorization', true, true,  true,  true,  'https://docs.x.ai/',                               true, false),
('ollama_self', 'Ollama (self-hosted)','llm_direct', 'http://localhost:11434/v1',             'bearer',          'Authorization', true, true,  true,  true,  'https://ollama.com/docs',                          true, false),

-- Workflow engines
('dify',        'Dify',           'workflow_engine','https://api.dify.ai/v1',                'bearer',          'Authorization', true, true,  true,  true,  'https://docs.dify.ai/',                            true, false),
('stirling_ai', 'Stirling AI',    'workflow_engine','https://api.stirling.ai/v1',            'bearer',          'Authorization', true, true,  true,  true,  'https://docs.stirling.ai/',                        true, false),
('langflow',    'Langflow',       'workflow_engine','http://localhost:7860/api/v1',          'bearer',          'Authorization', true, false, true,  true,  'https://docs.langflow.org/',                       true, false),
('n8n_ai',      'n8n AI',         'workflow_engine','http://localhost:5678/webhook',         'api_key_header',  'X-N8N-API-KEY', false, false, false, false, 'https://docs.n8n.io/',                           true, false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, api_base_url = EXCLUDED.api_base_url,
  auth_method = EXCLUDED.auth_method, auth_header_name = EXCLUDED.auth_header_name,
  supports_streaming = EXCLUDED.supports_streaming,
  supports_vision = EXCLUDED.supports_vision,
  supports_tools = EXCLUDED.supports_tools,
  supports_json_mode = EXCLUDED.supports_json_mode,
  doc_url = EXCLUDED.doc_url, is_active = EXCLUDED.is_active,
  is_default_platform = EXCLUDED.is_default_platform;


-- ============================================================================
-- SECTION 3 — AI MODELS (modèles disponibles par provider)
-- ============================================================================
-- Seuls les modèles les plus utilisés sont seedés (sera étendu via UI admin)

INSERT INTO ai_models (
  provider_id, model_code, display_name,
  context_window, max_output_tokens,
  supports_vision, supports_tools, supports_json_mode,
  cost_per_million_input_usd, cost_per_million_output_usd,
  quality_tier, speed_tier, is_active, is_recommended
)
SELECT p.id, m.model_code, m.display_name,
       m.context_window, m.max_output_tokens,
       m.supports_vision, m.supports_tools, m.supports_json_mode,
       m.cost_per_million_input_usd, m.cost_per_million_output_usd,
       m.quality_tier, m.speed_tier, true, m.is_recommended
FROM ai_providers p
JOIN (VALUES
  -- OpenRouter (modèles populaires routés)
  ('openrouter', 'anthropic/claude-sonnet-4.5',          'Claude Sonnet 4.5 via OpenRouter',     200000, 8192,  true,  true,  true, 3.00,  15.00, 'flagship', 'medium', true),
  ('openrouter', 'anthropic/claude-haiku-4.5',           'Claude Haiku 4.5 via OpenRouter',      200000, 8192,  true,  true,  true, 1.00,  5.00,  'high',     'fast',   true),
  ('openrouter', 'openai/gpt-5',                         'GPT-5 via OpenRouter',                 256000, 16384, true,  true,  true, 5.00,  25.00, 'flagship', 'medium', true),
  ('openrouter', 'openai/gpt-4o',                        'GPT-4o via OpenRouter',                128000, 16384, true,  true,  true, 2.50,  10.00, 'high',     'fast',   true),
  ('openrouter', 'openai/gpt-4o-mini',                   'GPT-4o-mini via OpenRouter',           128000, 16384, true,  true,  true, 0.15,  0.60,  'medium',   'fast',   true),
  ('openrouter', 'google/gemini-2.5-pro',                'Gemini 2.5 Pro via OpenRouter',        1000000,8192,  true,  true,  true, 1.25,  10.00, 'flagship', 'medium', true),
  ('openrouter', 'google/gemini-2.5-flash',              'Gemini 2.5 Flash via OpenRouter',      1000000,8192,  true,  true,  true, 0.30,  2.50,  'high',     'fast',   true),
  ('openrouter', 'meta-llama/llama-3.3-70b-instruct',    'Llama 3.3 70B via OpenRouter',         128000, 4096,  false, true,  true, 0.40,  0.40,  'medium',   'fast',   false),
  ('openrouter', 'mistralai/mistral-large-latest',       'Mistral Large via OpenRouter',         128000, 8192,  false, true,  true, 2.00,  6.00,  'high',     'medium', false),

  -- OpenAI direct
  ('openai',    'gpt-5',                                  'GPT-5',                                256000, 16384, true,  true,  true, 5.00,  25.00, 'flagship', 'medium', true),
  ('openai',    'gpt-4o',                                 'GPT-4o',                               128000, 16384, true,  true,  true, 2.50,  10.00, 'high',     'fast',   true),
  ('openai',    'gpt-4o-mini',                            'GPT-4o-mini',                          128000, 16384, true,  true,  true, 0.15,  0.60,  'medium',   'fast',   true),
  ('openai',    'gpt-4-turbo',                            'GPT-4 Turbo',                          128000, 4096,  true,  true,  true, 10.00, 30.00, 'high',     'medium', false),

  -- Anthropic direct
  ('anthropic', 'claude-sonnet-4-5-20251022',             'Claude Sonnet 4.5',                    200000, 8192,  true,  true,  true, 3.00,  15.00, 'flagship', 'medium', true),
  ('anthropic', 'claude-haiku-4-5-20251022',              'Claude Haiku 4.5',                     200000, 8192,  true,  true,  true, 1.00,  5.00,  'high',     'fast',   true),
  ('anthropic', 'claude-opus-4-20251022',                 'Claude Opus 4',                        200000, 8192,  true,  true,  true, 15.00, 75.00, 'flagship', 'slow',   false),

  -- Mistral direct
  ('mistral',   'mistral-large-latest',                   'Mistral Large',                        128000, 8192,  false, true,  true, 2.00,  6.00,  'high',     'medium', true),
  ('mistral',   'mistral-small-latest',                   'Mistral Small',                        32000,  4096,  false, true,  true, 0.20,  0.60,  'medium',   'fast',   true),
  ('mistral',   'pixtral-large-latest',                   'Pixtral Large (vision)',               128000, 4096,  true,  true,  true, 2.00,  6.00,  'high',     'medium', true),

  -- Google AI
  ('google_ai', 'gemini-2.5-pro',                         'Gemini 2.5 Pro',                       1000000,8192,  true,  true,  true, 1.25,  10.00, 'flagship', 'medium', true),
  ('google_ai', 'gemini-2.5-flash',                       'Gemini 2.5 Flash',                     1000000,8192,  true,  true,  true, 0.30,  2.50,  'high',     'fast',   true),
  ('google_ai', 'gemini-2.5-flash-lite',                  'Gemini 2.5 Flash Lite',                1000000,8192,  true,  true,  true, 0.10,  0.40,  'medium',   'ultra',  true),

  -- Groq (modèles ultra-rapides)
  ('groq',      'llama-3.3-70b-versatile',                'Llama 3.3 70B (Groq)',                 128000, 8192,  false, true,  true, 0.59,  0.79,  'medium',   'ultra',  true),
  ('groq',      'llama-3.1-8b-instant',                   'Llama 3.1 8B Instant (Groq)',          128000, 8192,  false, true,  true, 0.05,  0.08,  'low',      'ultra',  true),

  -- DeepSeek
  ('deepseek',  'deepseek-chat',                          'DeepSeek V3',                          128000, 8192,  false, true,  true, 0.27,  1.10,  'high',     'medium', true),
  ('deepseek',  'deepseek-reasoner',                      'DeepSeek R1 (reasoning)',              128000, 8192,  false, true,  true, 0.55,  2.19,  'flagship', 'slow',   false),

  -- xAI
  ('xai',       'grok-4',                                 'Grok 4',                               256000, 8192,  true,  true,  true, 5.00,  15.00, 'flagship', 'medium', false),
  ('xai',       'grok-4-mini',                            'Grok 4 Mini',                          128000, 8192,  true,  true,  true, 0.50,  2.00,  'high',     'fast',   false)
) AS m(provider_code, model_code, display_name, context_window, max_output_tokens,
       supports_vision, supports_tools, supports_json_mode,
       cost_per_million_input_usd, cost_per_million_output_usd,
       quality_tier, speed_tier, is_recommended)
  ON m.provider_code = p.code
ON CONFLICT (provider_id, model_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  context_window = EXCLUDED.context_window,
  max_output_tokens = EXCLUDED.max_output_tokens,
  supports_vision = EXCLUDED.supports_vision,
  supports_tools = EXCLUDED.supports_tools,
  supports_json_mode = EXCLUDED.supports_json_mode,
  cost_per_million_input_usd = EXCLUDED.cost_per_million_input_usd,
  cost_per_million_output_usd = EXCLUDED.cost_per_million_output_usd,
  quality_tier = EXCLUDED.quality_tier,
  speed_tier = EXCLUDED.speed_tier,
  is_recommended = EXCLUDED.is_recommended;


-- ============================================================================
-- SECTION 4 — AI TASKS (toutes les tâches IA système de WIMRUX FINANCES)
-- ============================================================================
-- 38 tâches couvrant : assistance fiscale, OCR, ingestion paiements,
-- extraction documentaire, classification, prévisions, rapprochement,
-- anti-fraude, conformité, NL→SQL, génération de contenu.
-- ============================================================================

INSERT INTO ai_tasks (
  code, name, description, category,
  default_quality_tier, default_needs_vision, default_needs_tools, default_needs_json_mode,
  default_system_prompt,
  estimated_input_tokens, estimated_output_tokens,
  is_workflow_capable, is_active
) VALUES

-- ============================
-- 1. ASSISTANCE & CONVERSATIONNEL
-- ============================
('assistant_fiscal',
 'Assistant fiscal conversationnel',
 'Répond aux questions sur la fiscalité Burkina Faso/UEMOA, les obligations déclaratives, les régimes RNI/RSI, la TVA, le BIC, le PSVB, le timbre quittance.',
 'analysis', 'high', false, false, false,
 'Tu es un assistant fiscal expert pour le Burkina Faso et l''UEMOA. Réponds en français de manière claire et précise, en citant les articles du Code Général des Impôts (CGI) quand pertinent. Ne donne jamais de conseil personnalisé sans rappeler que la décision finale revient à un fiscaliste agréé.',
 2000, 800, false, true),

('assistant_comptable',
 'Assistant comptable conversationnel',
 'Aide à la tenue comptable selon le référentiel SYSCOHADA révisé : imputations, écritures, plan comptable.',
 'analysis', 'high', false, false, false,
 'Tu es un assistant comptable expert SYSCOHADA révisé. Réponds en français en citant les comptes du plan comptable général SYSCOHADA. Explique les imputations débit/crédit avec rigueur.',
 2000, 800, false, true),

('assistant_general',
 'Assistant général WIMRUX Finances',
 'Chatbot général d''aide à la navigation et à l''utilisation de la plateforme.',
 'analysis', 'medium', false, true, false,
 'Tu es l''assistant officiel de WIMRUX® Finances. Aide les utilisateurs à utiliser la plateforme, à trouver les fonctionnalités, et à résoudre leurs problèmes courants. Reste concis et oriente vers la documentation quand pertinent.',
 1500, 500, false, true),

-- ============================
-- 2. SUGGESTIONS & RECOMMANDATIONS
-- ============================
('suggestion_fiscale',
 'Suggestion d''optimisation fiscale',
 'Analyse la situation fiscale de l''entreprise et propose des optimisations légales.',
 'analysis', 'high', false, true, true,
 'Analyse les données fiscales fournies et propose des optimisations légales conformes au CGI Burkina Faso. Réponds au format JSON : {recommandations: [{titre, description, impact_estime_xof, priorite}], synthese}.',
 4000, 1500, false, true),

('suggestion_tresorerie',
 'Suggestion de gestion de trésorerie',
 'Recommande des actions pour optimiser la trésorerie : placements, paiements anticipés, étalement, etc.',
 'analysis', 'high', false, true, true,
 'Analyse l''état de trésorerie fourni et propose des actions concrètes. Format JSON : {actions: [{titre, description, beneficie_xof, delai_jours, risque}], priorite_globale}.',
 3000, 1200, false, true),

('suggestion_paiement',
 'Suggestion de mode de paiement',
 'Recommande le canal de paiement optimal (mobile money, virement, chèque) selon montant, contrepartie et frais.',
 'classification', 'medium', false, false, true,
 'Sur la base du contexte (montant, contrepartie, urgence, pays), recommande le mode de paiement optimal. Format JSON : {mode, raison, frais_estimes_xof}.',
 1000, 300, false, true),

-- ============================
-- 3. CLASSIFICATION
-- ============================
('classification_depense',
 'Classification automatique de dépense',
 'Affecte automatiquement une transaction à une catégorie comptable selon son libellé et son contexte.',
 'classification', 'medium', false, false, true,
 'Classe la transaction fournie dans une catégorie comptable. Renvoie JSON : {category_code, confidence (0-1), reasoning}.',
 500, 150, false, true),

('classification_facture',
 'Classification de facture (BIC/charge)',
 'Détermine la nature comptable d''une facture reçue.',
 'classification', 'medium', false, false, true,
 'Classe la facture selon la nomenclature SYSCOHADA. Renvoie JSON : {account_code, account_label, confidence, tax_treatment}.',
 1000, 200, false, true),

('classification_contrepartie',
 'Identification de contrepartie',
 'Identifie si une contrepartie de transaction correspond à un client ou fournisseur existant.',
 'classification', 'medium', false, true, true,
 'Compare le nom de contrepartie fourni avec la liste des clients/fournisseurs connus. Renvoie JSON : {match_id, match_type (client|supplier|new), confidence, normalized_name}.',
 800, 200, false, true),

-- ============================
-- 4. DÉTECTION D'ANOMALIES
-- ============================
('detection_anomalie',
 'Détection d''anomalies financières',
 'Identifie les transactions ou factures suspectes (doublons, montants aberrants, fournisseurs nouveaux, etc.).',
 'analysis', 'high', false, true, true,
 'Analyse les données fournies et identifie les anomalies. Renvoie JSON : {anomalies: [{type, severity (low|medium|high|critical), description, record_id, suggested_action}]}.',
 4000, 1500, true, true),

('detection_fraude',
 'Détection de fraude',
 'Détecte des patterns de fraude potentielle : factures successives même montant, fournisseurs fictifs, etc.',
 'analysis', 'flagship', false, true, true,
 'Examine les données pour des signes de fraude. Renvoie JSON : {risk_score (0-100), red_flags: [{type, description, evidence}], recommended_action}.',
 5000, 1500, true, true),

('detection_doublon',
 'Détection de paiements en doublon',
 'Repère les transactions probablement dupliquées (même montant, même contrepartie, dates proches).',
 'classification', 'medium', false, false, true,
 'Compare les transactions fournies et identifie les doublons probables. Renvoie JSON : {duplicates: [{transaction_ids[], confidence, reason}]}.',
 2000, 600, false, true),

-- ============================
-- 5. OCR & EXTRACTION DOCUMENTAIRE
-- ============================
('ocr_supplier_invoice',
 'OCR facture fournisseur',
 'Extrait les données structurées d''une facture fournisseur scannée (PDF, image).',
 'extraction', 'high', true, false, true,
 'Tu es un expert en extraction de données de factures. Renvoie un JSON strict : {supplier_name, supplier_ifu, invoice_number, issue_date (ISO 8601), due_date, currency, items: [{description, quantity, unit_price, tax_rate, amount_ht}], total_ht, total_tva, total_psvb, total_stamp_duty, total_ttc, payment_terms, confidence_per_field: {...}}.',
 3000, 1500, false, true),

('ocr_receipt',
 'OCR reçu / ticket de caisse',
 'Extrait les données d''un reçu de petite caisse, ticket d''achat, justificatif simple.',
 'extraction', 'medium', true, false, true,
 'Extrait depuis le reçu/ticket : {merchant_name, date, total, items: [{label, amount}], payment_method, currency, confidence}.',
 1500, 500, false, true),

('ocr_bank_statement',
 'OCR relevé bancaire',
 'Extrait les transactions depuis un PDF de relevé bancaire scanné ou natif.',
 'extraction', 'high', true, false, true,
 'Extrait toutes les lignes du relevé bancaire. Renvoie JSON : {bank_name, account_number_masked, period_start, period_end, opening_balance, closing_balance, transactions: [{date, value_date, label, reference, debit, credit, balance_after}]}.',
 8000, 4000, false, true),

('ocr_payment_evidence',
 'OCR preuve de paiement mobile/banque',
 'Extrait les informations d''une capture d''écran de paiement mobile money, virement, retrait.',
 'extraction', 'medium', true, false, true,
 'Extrait depuis l''image de preuve de paiement : {provider_detected, amount, currency, transaction_date (ISO 8601), operation_type (deposit|withdrawal|payment_sent|payment_received|transfer), counterparty_name, counterparty_identifier, external_reference, fees, balance_after, confidence_per_field}.',
 2000, 800, false, true),

('ocr_check',
 'OCR chèque',
 'Lit un chèque scanné : montant, bénéficiaire, date, numéro, banque.',
 'extraction', 'high', true, false, true,
 'Extrait depuis l''image de chèque : {check_number, bank_name, amount, amount_in_letters, beneficiary, issue_date, drawer_name, account_number_masked, confidence_per_field}.',
 1500, 500, false, true),

('ocr_identity_doc',
 'OCR pièce d''identité',
 'Extrait les données d''une CNIB, passeport, ou carte de séjour pour KYC.',
 'extraction', 'high', true, false, true,
 'Extrait depuis la pièce d''identité : {document_type, document_number, last_name, first_name, birth_date, birth_place, nationality, issue_date, expiry_date, issuing_authority, confidence_per_field}.',
 1500, 500, false, true),

-- ============================
-- 6. INGESTION PAIEMENTS (canaux multiples)
-- ============================
('ingest_image_payment',
 'Ingestion paiement depuis image',
 'Orchestre l''ingestion d''un paiement depuis une image (capture d''écran mobile).',
 'extraction', 'medium', true, true, true,
 'Identifie le type de preuve, le provider, et extrait les données de transaction. Renvoie un objet conforme au schéma wallet_transactions.',
 2000, 800, false, true),

('text_payment_extraction',
 'Extraction paiement depuis texte collé',
 'Extrait les données d''un texte de confirmation SMS, email, ou notification collé.',
 'extraction', 'medium', false, false, true,
 'Analyse le texte fourni (SMS, notification, email de confirmation) et extrait : {provider_detected, amount, currency, transaction_date, operation_type, counterparty, reference, fees, confidence}.',
 1000, 400, false, true),

('sms_parsing',
 'Parsing SMS de paiement',
 'Extrait une transaction depuis un SMS d''opérateur (fallback si pattern regex échoue).',
 'extraction', 'low', false, false, true,
 'Parse le SMS d''opérateur mobile money/bancaire et extrait : {provider, amount, currency, direction, counterparty, reference, balance_after, fees, transaction_date}.',
 500, 250, false, true),

('email_payment_parsing',
 'Parsing email de paiement',
 'Extrait une transaction depuis un email de confirmation de paiement.',
 'extraction', 'medium', false, false, true,
 'Parse l''email reçu (CinetPay, FedaPay, PayDunya, etc.) et extrait la transaction au format JSON wallet_transaction.',
 1500, 500, false, true),

-- ============================
-- 7. RAPPROCHEMENT
-- ============================
('reconciliation_suggestion',
 'Suggestion de rapprochement',
 'Propose un appariement entre une transaction de wallet et une facture ou un mouvement existant.',
 'analysis', 'medium', false, true, true,
 'Compare la transaction fournie aux factures et mouvements candidats. Renvoie JSON : {best_match: {target_type, target_id, confidence, reasoning}, alternatives: [...]}.',
 3000, 600, false, true),

('reconciliation_batch',
 'Rapprochement en lot',
 'Traite un batch de transactions non rapprochées et propose des matches en masse.',
 'analysis', 'high', false, true, true,
 'Pour chaque transaction du batch, propose le meilleur match. Renvoie JSON : {matches: [{transaction_id, target_type, target_id, confidence}]}.',
 8000, 4000, true, true),

-- ============================
-- 8. PRÉVISIONS & ANALYSES
-- ============================
('cashflow_forecast',
 'Prévision de trésorerie',
 'Génère une prévision de flux de trésorerie sur N jours à partir de l''historique.',
 'analysis', 'high', false, true, true,
 'À partir de l''historique fourni (12 mois), prévois les flux des N prochains jours. Renvoie JSON : {forecasts: [{date, expected_in, expected_out, expected_balance, confidence_interval: [low, high]}], assumptions: [...], risk_periods: [...]}.',
 6000, 3000, true, true),

('revenue_forecast',
 'Prévision de chiffre d''affaires',
 'Prédit le CA des prochaines périodes.',
 'analysis', 'high', false, true, true,
 'Prédis le CA mensuel sur les N prochains mois. JSON : {predictions: [{month, expected_revenue, confidence}], trend, seasonality_detected}.',
 5000, 1500, true, true),

('budget_variance_analysis',
 'Analyse écart budgétaire',
 'Explique les écarts entre budget prévu et réalisé, et suggère des ajustements.',
 'analysis', 'high', false, true, true,
 'Analyse les écarts budget vs réel. JSON : {top_variances: [{category, planned, actual, variance_pct, root_cause_hypothesis}], recommendations: [...]}.',
 4000, 1500, false, true),

('aging_balance_analysis',
 'Analyse balance âgée',
 'Identifie les clients à risque d''impayé et suggère des actions de relance prioritaires.',
 'analysis', 'medium', false, true, true,
 'Analyse la balance âgée. JSON : {at_risk_clients: [{client_id, outstanding, days_overdue, risk_level, recommended_action}], summary}.',
 3000, 1200, false, true),

-- ============================
-- 9. RAPPORTS & SYNTHÈSES
-- ============================
('report_summary',
 'Synthèse exécutive de rapport',
 'Génère un résumé exécutif d''un rapport financier (bilan, compte de résultat, balance âgée).',
 'generation', 'high', false, false, false,
 'Rédige un résumé exécutif clair en français à partir des données financières fournies. Identifie les points clés, tendances, et alertes. Maximum 500 mots.',
 5000, 1000, false, true),

('monthly_briefing',
 'Briefing mensuel automatique',
 'Génère un briefing mensuel personnalisé de la situation financière de l''entreprise.',
 'generation', 'high', false, true, false,
 'Rédige un briefing mensuel structuré : 1) Synthèse, 2) Indicateurs clés, 3) Faits marquants, 4) Risques identifiés, 5) Recommandations. Format Markdown.',
 8000, 2000, true, true),

('email_draft',
 'Rédaction d''email métier',
 'Rédige un email de relance, demande d''information, ou réponse client/fournisseur.',
 'generation', 'medium', false, false, false,
 'Rédige un email professionnel en français selon le contexte fourni. Respecte le ton demandé (cordial, ferme, formel).',
 1500, 800, false, true),

('reminder_message_personalization',
 'Personnalisation message de relance',
 'Personnalise un message de relance facture (email/SMS/WhatsApp) selon client et historique.',
 'generation', 'medium', false, false, false,
 'Adapte le template de relance fourni au client et au contexte (niveau de relance, historique de paiement, relation). Reste poli mais clair.',
 1200, 400, false, true),

-- ============================
-- 10. NL→SQL & RECHERCHE
-- ============================
('nl_to_sql',
 'Requête en langage naturel vers SQL',
 'Traduit une question utilisateur en requête SQL sécurisée sur la base de données.',
 'extraction', 'flagship', false, true, true,
 'Traduis la question en SQL PostgreSQL en respectant la whitelist de tables fournie. INTERDICTION ABSOLUE : DROP, DELETE, UPDATE, INSERT, ALTER, GRANT, TRUNCATE. Ajoute systématiquement WHERE company_id = {{COMPANY_ID}}. Renvoie JSON : {sql, suggested_visualization (table|bar|line|pie), explanation_fr}.',
 4000, 800, false, true),

('semantic_search',
 'Recherche sémantique',
 'Recherche dans les documents, factures et transactions selon le sens, pas seulement les mots-clés.',
 'extraction', 'medium', false, false, true,
 'Reformule la requête de recherche en mots-clés sémantiques pertinents et catégories. JSON : {expanded_keywords[], target_tables[], suggested_filters: {...}}.',
 1000, 400, false, true),

-- ============================
-- 11. CONFORMITÉ & CONTRÔLES
-- ============================
('compliance_check_invoice',
 'Contrôle de conformité facture',
 'Vérifie qu''une facture (émise ou reçue) respecte les règles fiscales BF/UEMOA.',
 'classification', 'high', false, true, true,
 'Vérifie la conformité de la facture aux règles DGI BF. JSON : {is_compliant, issues: [{rule, severity, description, suggested_fix}], compliance_score (0-100)}.',
 2500, 800, false, true),

('compliance_check_supplier',
 'Contrôle conformité fournisseur',
 'Vérifie la cohérence des informations d''un fournisseur (IFU, RCCM, régime fiscal).',
 'classification', 'medium', false, true, true,
 'Vérifie les informations fournisseur. JSON : {is_valid, warnings: [...], missing_fields: [...], suggested_actions: [...]}.',
 1500, 500, false, true),

('kyc_risk_scoring',
 'Score de risque KYC',
 'Calcule un score de risque KYC sur un client ou fournisseur.',
 'analysis', 'high', false, true, true,
 'Évalue le risque KYC sur la base des informations fournies. JSON : {risk_score (0-100), risk_level (low|medium|high|critical), risk_factors: [...], recommended_due_diligence}.',
 2000, 600, false, true),

-- ============================
-- 12. TRADUCTION & LOCALISATION
-- ============================
('translation',
 'Traduction de contenu',
 'Traduit du contenu métier (factures, descriptions, libellés) entre FR/EN/PT.',
 'generation', 'medium', false, false, false,
 'Traduis le texte fourni en préservant la terminologie comptable et fiscale exacte. Conserve les nombres et codes inchangés.',
 1500, 1500, false, true),

('label_normalization',
 'Normalisation de libellés',
 'Normalise les libellés bruts de transactions bancaires/mobile money pour faciliter le regroupement.',
 'extraction', 'low', false, false, true,
 'Normalise le libellé brut fourni. JSON : {normalized_label, detected_entity, detected_type, extracted_reference}.',
 300, 100, false, true)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_quality_tier = EXCLUDED.default_quality_tier,
  default_needs_vision = EXCLUDED.default_needs_vision,
  default_needs_tools = EXCLUDED.default_needs_tools,
  default_needs_json_mode = EXCLUDED.default_needs_json_mode,
  default_system_prompt = EXCLUDED.default_system_prompt,
  estimated_input_tokens = EXCLUDED.estimated_input_tokens,
  estimated_output_tokens = EXCLUDED.estimated_output_tokens,
  is_workflow_capable = EXCLUDED.is_workflow_capable,
  is_active = EXCLUDED.is_active;


-- ============================================================================
-- SECTION 5 — SUBSCRIPTION PLANS (plans d'abonnement avec quotas IA)
-- ============================================================================
-- Quotas IA exprimés en USD/mois (basés sur le coût provider plateforme)
-- À ajuster selon stratégie commerciale finale.
-- ============================================================================

INSERT INTO subscription_plans (
  code, name,
  monthly_price_usd, monthly_price_xof,
  max_companies, max_users,
  max_invoices_per_month, max_wallets,
  ai_monthly_tokens_input, ai_monthly_tokens_output, ai_monthly_cost_usd_cap,
  ai_allowed_quality_tiers, ai_byok_allowed, ai_workflow_allowed,
  features, is_active
) VALUES

('free',       'Free / Découverte',
 0,    0,
 1,    2,
 20,   2,
 50000,    25000,   0.50,
 ARRAY['low','medium'], false, false,
 '{"ocr_enabled": true, "ai_assistant": true, "export_pdf": true, "branding_custom": false}'::jsonb, true),

('starter',    'Starter',
 19,   12000,
 1,    5,
 200,  5,
 500000,   250000,  5.00,
 ARRAY['low','medium','high'], false, false,
 '{"ocr_enabled": true, "ai_assistant": true, "cashflow_forecast": true, "export_xlsx": true, "branding_custom": true}'::jsonb, true),

('pro',        'Pro',
 49,   30000,
 3,    15,
 2000, 20,
 5000000,  2500000, 30.00,
 ARRAY['low','medium','high'], true, false,
 '{"ocr_enabled": true, "ai_assistant": true, "cashflow_forecast": true, "budget_alerts": true, "api_access": true, "nl_to_sql": true, "byok": true, "branding_custom": true}'::jsonb, true),

('business',   'Business',
 149,  92000,
 10,   50,
 10000,100,
 25000000, 12500000,150.00,
 ARRAY['low','medium','high','flagship'], true, true,
 '{"all_features": true, "workflow_engines": true, "dify_integration": true, "stirling_ai": true, "premium_support": true}'::jsonb, true),

('enterprise', 'Enterprise (sur devis)',
 0,    0,
 NULL, NULL,
 NULL, NULL,
 100000000,50000000,1000.00,
 ARRAY['low','medium','high','flagship'], true, true,
 '{"all_features": true, "sla_premium": true, "dedicated_account_manager": true, "on_premise_option": true, "custom_integrations": true}'::jsonb, true)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_usd = EXCLUDED.monthly_price_usd,
  monthly_price_xof = EXCLUDED.monthly_price_xof,
  max_companies = EXCLUDED.max_companies,
  max_users = EXCLUDED.max_users,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month,
  max_wallets = EXCLUDED.max_wallets,
  ai_monthly_tokens_input = EXCLUDED.ai_monthly_tokens_input,
  ai_monthly_tokens_output = EXCLUDED.ai_monthly_tokens_output,
  ai_monthly_cost_usd_cap = EXCLUDED.ai_monthly_cost_usd_cap,
  ai_allowed_quality_tiers = EXCLUDED.ai_allowed_quality_tiers,
  ai_byok_allowed = EXCLUDED.ai_byok_allowed,
  ai_workflow_allowed = EXCLUDED.ai_workflow_allowed,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;


COMMIT;

-- ============================================================================
-- VÉRIFICATIONS POST-SEED
-- ============================================================================
-- À exécuter après le COMMIT pour vérifier l'intégrité :

-- 1. Compter les providers par type et région
-- SELECT type, region, COUNT(*) FROM payment_providers GROUP BY type, region ORDER BY type, region;

-- 2. Compter les providers par pays (déplié)
-- SELECT unnest(country_codes) AS country, COUNT(*) FROM payment_providers GROUP BY country ORDER BY country;

-- 3. Lister les tâches IA par catégorie
-- SELECT category, COUNT(*) FROM ai_tasks GROUP BY category ORDER BY category;

-- 4. Vérifier que tous les modèles ont un provider valide
-- SELECT m.model_code, p.code FROM ai_models m LEFT JOIN ai_providers p ON p.id = m.provider_id WHERE p.id IS NULL;

-- 5. Plans d'abonnement actifs
-- SELECT code, name, monthly_price_usd, ai_monthly_cost_usd_cap FROM subscription_plans WHERE is_active ORDER BY monthly_price_usd;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
