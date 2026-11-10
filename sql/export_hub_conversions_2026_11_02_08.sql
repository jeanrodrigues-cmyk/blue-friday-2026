-- Hub de Operacoes -> Blue Friday 2026
-- Semana anterior: 02/11/2026 a 08/11/2026 (America/Sao_Paulo)
-- Executar no Supabase SQL Editor do HUB DE OPERACOES.
-- Nao inclui dados pessoais de alunos.
WITH filtered AS (
  SELECT
    id,
    conversion_analyst_id,
    COALESCE(NULLIF(TRIM(analyst_name), ''), 'Analista sem nome') AS analyst_name,
    final_result,
    (COALESCE(final_result_at, finalized_at) AT TIME ZONE 'America/Sao_Paulo')::date AS reference_date,
    COALESCE(amount, 0)::numeric AS amount
  FROM public.v_refund_conversions
  WHERE conversion_origin = 'analyst'
    AND conversion_analyst_id IS NOT NULL
    AND final_result IN ('voucher_generated', 'cancelled')
    AND COALESCE(final_result_at, finalized_at) >= TIMESTAMP '2026-11-02 00:00:00' AT TIME ZONE 'America/Sao_Paulo'
    AND COALESCE(final_result_at, finalized_at) < TIMESTAMP '2026-11-09 00:00:00' AT TIME ZONE 'America/Sao_Paulo'
)
SELECT reference_date, conversion_analyst_id, analyst_name,
  COUNT(DISTINCT id) FILTER (WHERE final_result = 'voucher_generated') AS vouchers,
  COUNT(DISTINCT id) FILTER (WHERE final_result = 'cancelled') AS cancelamentos,
  COUNT(DISTINCT id) AS total_conversoes,
  ROUND(SUM(amount), 2) AS valor_associado
FROM filtered
GROUP BY reference_date, conversion_analyst_id, analyst_name
ORDER BY reference_date, analyst_name;
