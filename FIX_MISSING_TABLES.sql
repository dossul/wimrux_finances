-- ============================================================
-- FIX LOGIN BUG - Tables manquantes
-- À exécuter dans l'éditeur SQL InsForge
-- https://gfe4bd9y.eu-central.insforge.app
-- ============================================================

-- 1. Table user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE,
  company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'viewer',
  full_name   TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "admin_all_profiles"
  ON public.user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'project_admin')
    )
  );

-- 2. Table company_subscriptions
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free',
  status      TEXT NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_read_subscriptions"
  ON public.company_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.company_id = company_subscriptions.company_id
        AND user_profiles.user_id = auth.uid()
    )
  );

-- 3. Insérer profil admin@westago.bf (user_id connu = 56ae5c7d-...)
INSERT INTO public.user_profiles (user_id, company_id, role, full_name)
SELECT
  '56ae5c7d-c6aa-46a1-bf6b-d4af7dd57a33'::uuid,
  c.id,
  'admin',
  'Admin WESTAGO'
FROM public.companies c
WHERE c.name = 'WESTAGO SARL'
LIMIT 1
ON CONFLICT (user_id) DO UPDATE
  SET role       = 'admin',
      full_name  = 'Admin WESTAGO',
      company_id = EXCLUDED.company_id;

-- Vérification
SELECT 'user_profiles' as table_name, count(*) FROM public.user_profiles
UNION ALL
SELECT 'company_subscriptions', count(*) FROM public.company_subscriptions;
