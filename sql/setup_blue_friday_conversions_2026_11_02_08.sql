-- Blue Friday 2026 | Conversoes Hub | 02 a 08/11
-- Execute no SQL Editor do SUPABASE DA BLUE FRIDAY.
-- Dados agregados da consulta do Hub enviada pelo usuario.
-- Nao cria conexao direta entre bancos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.bf_refund_conversions_daily (
 reference_date date NOT NULL,
 analyst_name text NOT NULL,
 vouchers integer NOT NULL CHECK(vouchers>=0),
 cancellations integer NOT NULL CHECK(cancellations>=0),
 associated_amount numeric(14,2) NOT NULL CHECK(associated_amount>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(reference_date,analyst_name)
);
ALTER TABLE public.bf_refund_conversions_daily ENABLE ROW LEVEL SECURITY;
-- Leitura permitida apenas para usuarios autenticados da Blue Friday com perfil ativo.
DROP POLICY IF EXISTS bf_conversions_active_read ON public.bf_refund_conversions_daily;
CREATE POLICY bf_conversions_active_read ON public.bf_refund_conversions_daily
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.bf_profiles p WHERE p.user_id=auth.uid() AND p.active=true)
 );
-- Sem politicas de escrita pelo cliente. Alteracoes somente via SQL Editor administrativo.
CREATE TEMP TABLE incoming_conversions (
 reference_date date,analyst_name text,vouchers integer,cancellations integer,associated_amount numeric(14,2)
) ON COMMIT DROP;
INSERT INTO incoming_conversions VALUES
 ('2026-11-04','Alice Faria',2,1,758.41),
 ('2026-11-04','Carla Diléo',1,0,39.92),
 ('2026-11-05','Alice Faria',2,2,508.60),
 ('2026-11-05','Carla Diléo',0,4,662.96),
 ('2026-11-06','Alice Faria',0,1,151.90),
 ('2026-11-06','Carla Diléo',1,4,409.50);
DO $$
BEGIN
 IF (SELECT count(*) FROM incoming_conversions)<>6
 OR (SELECT sum(vouchers+cancellations) FROM incoming_conversions)<>18
 OR (SELECT sum(vouchers) FROM incoming_conversions)<>6
 OR (SELECT sum(cancellations) FROM incoming_conversions)<>12
 OR (SELECT sum(associated_amount) FROM incoming_conversions)<>2531.29
 THEN RAISE EXCEPTION 'Falha na verificacao da base do Hub'; END IF;
END $$;
DELETE FROM public.bf_refund_conversions_daily
 WHERE reference_date BETWEEN '2026-11-02' AND '2026-11-08';
INSERT INTO public.bf_refund_conversions_daily
 (reference_date,analyst_name,vouchers,cancellations,associated_amount)
 SELECT reference_date,analyst_name,vouchers,cancellations,associated_amount FROM incoming_conversions;
COMMIT;
SELECT reference_date,analyst_name,vouchers,cancellations,associated_amount
FROM public.bf_refund_conversions_daily
WHERE reference_date BETWEEN '2026-11-02' AND '2026-11-08'
ORDER BY reference_date,analyst_name;
