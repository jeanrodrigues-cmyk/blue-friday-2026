-- Blue Friday 2026: metas configuráveis e acompanhamento de indicadores.
create table if not exists public.bf_area_goals (
 id uuid primary key default gen_random_uuid(),
 area_name text not null,
 metric_key text not null,
 label text not null,
 unit text not null default 'count' check (unit in ('count','BRL','percent','minutes','hours')),
 direction text not null default 'min' check (direction in ('min','max','exact')),
 target_value numeric not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(area_name,metric_key)
);
create index if not exists bf_area_goals_area_idx on public.bf_area_goals(area_name,active);
alter table public.bf_area_goals enable row level security;
drop policy if exists bf_area_goals_read on public.bf_area_goals;
create policy bf_area_goals_read on public.bf_area_goals for select to authenticated using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists bf_area_goals_admin_insert on public.bf_area_goals;
create policy bf_area_goals_admin_insert on public.bf_area_goals for insert to authenticated with check (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
drop policy if exists bf_area_goals_admin_update on public.bf_area_goals;
create policy bf_area_goals_admin_update on public.bf_area_goals for update to authenticated using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')) with check (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
grant select,insert,update on public.bf_area_goals to authenticated;
-- Não alterar bf_daily_metrics sem confirmar esquema e políticas atuais.
