-- Execute uma vez no SQL Editor do Supabase Blue Friday.
-- Preserva registros anteriores; sem inventar quantidades de atendimentos.
alter table public.bf_media_procon_daily
 add column if not exists procon_met_24h boolean;
-- Registros antigos com contagem auditada podem ser derivados com segurança.
update public.bf_media_procon_daily
 set procon_met_24h = (procon_over_24h = 0)
 where procon_met_24h is null
   and procon_total is not null
   and procon_over_24h is not null;
-- Segunda e terça, conforme confirmação manual do responsável.
-- Inserir via painel autenticado (recomendado) para preservar recorded_by e auditoria.
