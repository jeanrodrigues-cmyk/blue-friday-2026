-- Blue Friday 2026: staging de Marcas (fonte: Google Sheets).
-- Execute manualmente no Supabase antes de habilitar a sincronizacao.
create table if not exists public.bf_brands_daily (
  reference_date date primary key,
  quero_pago_unialphaville numeric(14,2) not null default 0,
  quero_pago_uniasp numeric(14,2) not null default 0,
  pef_unialphaville numeric(14,2) not null default 0,
  pef_uniasp numeric(14,2) not null default 0,
  source_url text not null,
  synced_at timestamptz not null default now(),
  check (quero_pago_unialphaville >= 0 and quero_pago_uniasp >= 0 and pef_unialphaville >= 0 and pef_uniasp >= 0)
);
create table if not exists public.bf_brands_cash (
  reference_date date primary key,
  required boolean not null default false,
  closed_at_18h boolean,
  confirmed_at timestamptz,
  notes text,
  source_url text not null,
  synced_at timestamptz not null default now(),
  constraint brands_cash_confirmation check (closed_at_18h is null or confirmed_at is not null)
);
create table if not exists public.bf_brands_invoices (
  document_key text primary key,
  reference_date date not null,
  amount numeric(14,2) not null,
  classification text not null,
  description text,
  source_url text not null,
  synced_at timestamptz not null default now()
);
alter table public.bf_brands_daily enable row level security;
alter table public.bf_brands_cash enable row level security;
alter table public.bf_brands_invoices enable row level security;
drop policy if exists brands_daily_read on public.bf_brands_daily;
create policy brands_daily_read on public.bf_brands_daily for select to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true)
);
drop policy if exists brands_cash_read on public.bf_brands_cash;
create policy brands_cash_read on public.bf_brands_cash for select to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true)
);
drop policy if exists brands_invoices_read on public.bf_brands_invoices;
create policy brands_invoices_read on public.bf_brands_invoices for select to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true)
);
-- Escrita restrita ao administrador ativo. Sem acesso anonimo e sem chave service_role no navegador.
drop policy if exists brands_daily_admin on public.bf_brands_daily;
create policy brands_daily_admin on public.bf_brands_daily for all to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
) with check (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
);
drop policy if exists brands_cash_admin on public.bf_brands_cash;
create policy brands_cash_admin on public.bf_brands_cash for all to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
) with check (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
);
drop policy if exists brands_invoices_admin on public.bf_brands_invoices;
create policy brands_invoices_admin on public.bf_brands_invoices for all to authenticated using (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
) with check (
 exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')
);
