-- Blue Friday 2026: substituicao controlada da base PEF de novembro
-- Executar manualmente no SQL Editor do projeto Supabase correto.
-- Fonte: apuracao operacional validada (150 operacoes / R$ 32.633,31).
-- ATENCAO: substitui SOMENTE os dias 03, 04, 05, 06 e 09/11.
-- Preserva todos os demais dias e cria backup dos registros alterados.
-- Conferir antes de executar se os dados de origem sao o consolidado oficial.
BEGIN;

CREATE TABLE IF NOT EXISTS public.bf_refund_pef_daily_backup (
  backup_id uuid NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  original_row jsonb NOT NULL
);

CREATE TEMP TABLE bf_pef_new (
  reference_date date NOT NULL,
  team text NOT NULL,
  refund_count integer NOT NULL,
  refunded_amount numeric(14,2) NOT NULL
) ON COMMIT DROP;

INSERT INTO bf_pef_new VALUES
('2026-11-03','Consolidado operacional',35,7549.12),
('2026-11-04','Consolidado operacional',23,4472.05),
('2026-11-05','Consolidado operacional',26,5288.52),
('2026-11-06','Consolidado operacional',32,7750.97),
('2026-11-09','Consolidado operacional',34,7572.65);

DO $$
BEGIN
  IF (SELECT count(*) FROM bf_pef_new) <> 5
    OR (SELECT sum(refund_count) FROM bf_pef_new) <> 150
    OR (SELECT sum(refunded_amount) FROM bf_pef_new) <> 32633.31
  THEN
    RAISE EXCEPTION 'Validacao de valores falhou. Nenhuma alteracao aplicada.';
  END IF;
END $$;

LOCK TABLE public.bf_refund_pef_daily IN SHARE ROW EXCLUSIVE MODE;

-- Backup integral dos registros que serao substituidos, na mesma transacao.
INSERT INTO public.bf_refund_pef_daily_backup (backup_id, original_row)
SELECT 'a2c70f1a-19e9-4c65-90b3-9d66e9c0a401'::uuid, to_jsonb(t)
FROM public.bf_refund_pef_daily t
WHERE reference_date IN (SELECT reference_date FROM bf_pef_new);

DELETE FROM public.bf_refund_pef_daily
WHERE reference_date IN (SELECT reference_date FROM bf_pef_new);

INSERT INTO public.bf_refund_pef_daily
  (reference_date, team, refund_count, refunded_amount)
SELECT reference_date, team, refund_count, refunded_amount FROM bf_pef_new;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.bf_refund_pef_daily
      WHERE reference_date IN (SELECT reference_date FROM bf_pef_new)) <> 5
    OR (SELECT sum(refund_count) FROM public.bf_refund_pef_daily
      WHERE reference_date IN (SELECT reference_date FROM bf_pef_new)) <> 150
    OR (SELECT sum(refunded_amount) FROM public.bf_refund_pef_daily
      WHERE reference_date IN (SELECT reference_date FROM bf_pef_new)) <> 32633.31
  THEN
    RAISE EXCEPTION 'Conferencia pos-gravacao falhou. Transacao sera revertida.';
  END IF;
END $$;
COMMIT;

-- Conferencia:
SELECT reference_date, team, refund_count, refunded_amount
FROM public.bf_refund_pef_daily
WHERE reference_date IN ('2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-09')
ORDER BY reference_date, team;
