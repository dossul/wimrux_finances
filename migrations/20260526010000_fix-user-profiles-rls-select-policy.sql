-- ============================================================
-- FIX: RLS Policy user_profiles SELECT — dépendance circulaire
-- Date: 2026-05-26
-- Symptôme: Login réussi (API 200) mais page blanche après connexion.
--           loadProfile() retournait [] à cause d'une RLS circulaire.
-- Root cause: La policy SELECT utilisait uniquement get_user_company_id()
--             pour filtrer. Or get_user_company_id() lit user_profiles
--             elle-même → dépendance circulaire → 0 lignes retournées
--             → profile = null → role = null → hasPermission() = false
--             → redirect loop → page blanche.
-- Fix: Ajouter (user_id::text = auth.uid()::text) comme condition OU
--      pour permettre à un user de lire son propre profil directement.
-- ============================================================

DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;

CREATE POLICY user_profiles_select
  ON public.user_profiles
  FOR SELECT
  USING (
    (user_id::text = auth.uid()::text)
    OR
    (company_id = get_user_company_id())
  );
