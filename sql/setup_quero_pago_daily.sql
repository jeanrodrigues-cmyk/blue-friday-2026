-- Blue Friday 2026 | Quero Pago
-- Executar no Supabase DA BLUE FRIDAY.
CREATE TABLE IF NOT EXISTS public.bf_quero_pago_daily (
 reference_date date PRIMARY KEY,
 requests integer NOT NULL CHECK(requests>=0),
 resolved integer NOT NULL CHECK(resolved>=0),
 pending integer NOT NULL CHECK(pending>=0),
 amount numeric(14,2) NOT NULL CHECK(amount>=0),
 source text NOT NULL CHECK(length(trim(source))>0),
 notes text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT qp_total_matches CHECK(requests=resolved+pending)
);
ALTER TABLE public.bf_quero_pago_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bf_qp_read ON public.bf_quero_pago_daily;
CREATE POLICY bf_qp_read ON public.bf_quero_pago_daily FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.bf_profiles p WHERE p.user_id=auth.uid() AND p.active=true));
DROP POLICY IF EXISTS bf_qp_admin_insert ON public.bf_quero_pago_daily;
CREATE POLICY bf_qp_admin_insert ON public.bf_quero_pago_daily FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.bf_profiles p WHERE p.user_id=auth.uid() AND p.active=true AND p.role='admin'));
DROP POLICY IF EXISTS bf_qp_admin_update ON public.bf_quero_pago_daily;
CREATE POLICY bf_qp_admin_update ON public.bf_quero_pago_daily FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.bf_profiles p WHERE p.user_id=auth.uid() AND p.active=true AND p.role='admin'))
 WITH CHECK(EXISTS(SELECT 1 FROM public.bf_profiles p WHERE p.user_id=auth.uid() AND p.active=true AND p.role='admin'));
-- Nenhum dado artificial inserido.
