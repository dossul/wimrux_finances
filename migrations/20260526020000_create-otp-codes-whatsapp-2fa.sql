-- ============================================================
-- OTP WhatsApp 2FA — Table otp_codes
-- Date: 2026-05-26
-- Objectif: Stocker les codes OTP envoyés via WhatsApp (whapi.cloud)
--           pour le 2FA en attendant le 2FA natif InsForge (Q3 2026)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  phone        text NOT NULL,
  code         text NOT NULL,
  purpose      text NOT NULL DEFAULT 'login_2fa',
  used         boolean NOT NULL DEFAULT false,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_codes_user_id_idx  ON public.otp_codes(user_id);
CREATE INDEX IF NOT EXISTS otp_codes_expires_at_idx ON public.otp_codes(expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY otp_codes_user ON public.otp_codes
  FOR ALL
  USING (user_id::text = auth.uid()::text);
