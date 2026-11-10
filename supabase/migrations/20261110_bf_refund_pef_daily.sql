-- Blue Friday 2026 | Reembolso PEF (executar apos revisao no Supabase SQL Editor)
-- Fonte: somente registros agregados de membership_pef + refund extraidos do Databricks.
create table if not exists public.bf_refund_pef_daily (
  reference_date date not null check (reference_date between date '2026-11-01' and date '2026-11-30'),
  team text not null check (length(trim(team)) between 1 and 120),
  refund_count integer not null check (refund_count >= 0),
  refunded_amount numeric(16,2) not null check (refunded_amount >= 0),
  source text not null default 'databricks_membership_pef_refund',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key(reference_date,team)
);
alter table public.bf_refund_pef_daily enable row level security;
revoke all on public.bf_refund_pef_daily from anon;
grant select on public.bf_refund_pef_daily to authenticated;
grant insert,update on public.bf_refund_pef_daily to authenticated;
drop policy if exists bf_refund_pef_read on public.bf_refund_pef_daily;
create policy bf_refund_pef_read on public.bf_refund_pef_daily for select to authenticated
using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists bf_refund_pef_admin_insert on public.bf_refund_pef_daily;
create policy bf_refund_pef_admin_insert on public.bf_refund_pef_daily for insert to authenticated
with check (updated_by=auth.uid() and exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
drop policy if exists bf_refund_pef_admin_update on public.bf_refund_pef_daily;
create policy bf_refund_pef_admin_update on public.bf_refund_pef_daily for update to authenticated
using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'))
with check (updated_by=auth.uid() and exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
-- Nao ha DELETE policy: substituicao de base deve ocorrer somente apos validacao.
-- bf_profiles confirmado em 2026-11-10: user_id uuid, role text, active boolean.
-- IMPORTANTE: nao executar em projeto Supabase de producao sem confirmar o projeto-alvo.
