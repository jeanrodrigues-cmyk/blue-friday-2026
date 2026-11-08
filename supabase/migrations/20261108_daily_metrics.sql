-- Blue Friday 2026: base auditavel para importacoes e historico diario.
-- Executar no SQL Editor do projeto Supabase Blue Friday, apos revisar.
-- Nao altera as tabelas existentes nem calcula premiacoes.
begin;

create table if not exists public.bf_data_imports (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  area_name text not null,
  reference_date date not null,
  file_name text not null,
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_accepted integer not null default 0 check (rows_accepted >= 0),
  status text not null default 'pending' check (status in ('pending','validated','rejected')),
  notes text,
  imported_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  check (rows_accepted <= rows_received)
);

create table if not exists public.bf_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  area_name text not null,
  member_name text,
  metric_key text not null,
  reference_date date not null,
  metric_value numeric not null,
  unit text not null check (unit in ('count','BRL','percent','minutes','hours')),
  source_name text not null,
  import_id uuid references public.bf_data_imports(id) on delete restrict,
  verified boolean not null default false,
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (area_name, member_name, metric_key, reference_date, source_name)
);

create index if not exists bf_daily_metrics_area_date_idx
  on public.bf_daily_metrics (area_name, reference_date desc);
create index if not exists bf_data_imports_area_date_idx
  on public.bf_data_imports (area_name, reference_date desc);

alter table public.bf_data_imports enable row level security;
alter table public.bf_daily_metrics enable row level security;

-- Leitura somente para usuarios ativos com perfil no projeto.
-- Escrita somente para administradores ativos, ate que o fluxo de aprovacao esteja pronto.
create policy bf_data_imports_read_active on public.bf_data_imports
  for select to authenticated using (
    exists (select 1 from public.bf_profiles p where p.user_id = (select auth.uid()) and p.active = true)
  );
create policy bf_data_imports_admin_insert on public.bf_data_imports
  for insert to authenticated with check (
    imported_by = (select auth.uid()) and
    exists (select 1 from public.bf_profiles p where p.user_id = (select auth.uid()) and p.active = true and p.role = 'admin')
  );
create policy bf_daily_metrics_read_active on public.bf_daily_metrics
  for select to authenticated using (
    exists (select 1 from public.bf_profiles p where p.user_id = (select auth.uid()) and p.active = true)
  );
create policy bf_daily_metrics_admin_insert on public.bf_daily_metrics
  for insert to authenticated with check (
    recorded_by = (select auth.uid()) and
    exists (select 1 from public.bf_profiles p where p.user_id = (select auth.uid()) and p.active = true and p.role = 'admin')
  );

commit;
