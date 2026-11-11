-- Blue Friday | Chargeback. Executar no SQL Editor do projeto Blue Friday.
create table if not exists public.bf_chargeback_daily (
 reference_date date primary key,
 received integer not null check(received>=0),
 resolved integer not null check(resolved>=0),
 pending integer not null check(pending>=0),
 missed_deadlines integer not null check(missed_deadlines>=0),
 notes text,
 updated_at timestamptz not null default now(),
 updated_by uuid default auth.uid()
);
create table if not exists public.bf_chargeback_weekly (
 week_start date primary key,
 week_end date not null,
 mission_confirmed boolean not null default false,
 prize_paid boolean not null default false,
 confirmed_by uuid default auth.uid(),
 confirmed_at timestamptz default now(),
 notes text,
 constraint valid_chargeback_week check(week_end>=week_start)
);
alter table public.bf_chargeback_daily enable row level security;
alter table public.bf_chargeback_weekly enable row level security;
drop policy if exists cb_daily_read on public.bf_chargeback_daily;
create policy cb_daily_read on public.bf_chargeback_daily for select to authenticated using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists cb_week_read on public.bf_chargeback_weekly;
create policy cb_week_read on public.bf_chargeback_weekly for select to authenticated using (exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists cb_daily_admin on public.bf_chargeback_daily;
create policy cb_daily_admin on public.bf_chargeback_daily for all to authenticated using(exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')) with check(exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
drop policy if exists cb_week_admin on public.bf_chargeback_weekly;
create policy cb_week_admin on public.bf_chargeback_weekly for all to authenticated using(exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')) with check(exists(select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
-- Confirmacao informada pela operacao: semana 1 cumprida, pagamento nao confirmado.
insert into public.bf_chargeback_weekly(week_start,week_end,mission_confirmed,prize_paid,notes)
values('2026-11-01','2026-11-08',true,false,'Missao confirmada pela operacao: disputas diarias zeradas e nenhum prazo perdido. Quantidades nao informadas.')
on conflict(week_start) do nothing;
