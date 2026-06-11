-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 01: Extensions PostgreSQL
-- =============================================================================
-- ⚠️  NOTES SUPABASE:
--   • fuzzystrmatch, pgcrypto, plpgsql : disponibles sur tous les plans
--   • http : disponible, activer via Dashboard > Database > Extensions
--   • pg_cron : disponible sur Pro+ uniquement (Dashboard > Database > Extensions)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch"  WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"        WITH SCHEMA extensions;
-- http : décommentez si nécessaire (plan Pro+)
-- CREATE EXTENSION IF NOT EXISTS "http"         WITH SCHEMA extensions;
-- pg_cron : décommentez si plan Pro+
-- CREATE EXTENSION IF NOT EXISTS "pg_cron"      WITH SCHEMA pg_catalog;
