-- Executar no SQL Editor do projeto Supabase blue-friday-2026
create table if not exists public.bf_media_procon_daily (
  reference_date date primary key,
  media_queue_cleared boolean,
  comments_handled boolean,
  procon_total integer,
  procon_within_24h integer,
  procon_over_24h integer,
  procon_source text,
  notes text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bf_mp_counts_nonnegative check (procon_total >= 0 and procon_within_24h >= 0 and procon_over_24h >= 0),
  constraint bf_mp_counts_consistent check (procon_total is null or (procon_within_24h is not null and procon_over_24h is not null and procon_total = procon_within_24h + procon_over_24h)),
  constraint bf_mp_procon_complete check ((procon_total is null and procon_within_24h is null and procon_over_24h is null) or procon_total is not null)
);
create table if not exists public.bf_media_procon_audit (
  id bigint generated always as identity primary key,
  reference_date date not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  previous_record jsonb,
  new_record jsonb not null
);
create or replace function public.bf_mp_audit_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if row(to_jsonb(old)) is not distinct from row(to_jsonb(new)) then return new; end if;
    new.updated_at := now();
  end if;
  insert into public.bf_media_procon_audit(reference_date,changed_by,previous_record,new_record)
  values (new.reference_date, auth.uid(), case when tg_op='UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end $$;
drop trigger if exists bf_mp_audit on public.bf_media_procon_daily;
create trigger bf_mp_audit before insert or update on public.bf_media_procon_daily
for each row execute function public.bf_mp_audit_changes();
alter table public.bf_media_procon_daily enable row level security;
alter table public.bf_media_procon_audit enable row level security;
revoke all on public.bf_media_procon_daily, public.bf_media_procon_audit from anon;
grant select,insert,update on public.bf_media_procon_daily to authenticated;
grant select on public.bf_media_procon_audit to authenticated;
create policy "mp_daily_read_active" on public.bf_media_procon_daily for select to authenticated
using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active));
create policy "mp_daily_admin_insert" on public.bf_media_procon_daily for insert to authenticated
with check (recorded_by=auth.uid() and exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active and p.role='admin'));
create policy "mp_daily_admin_update" on public.bf_media_procon_daily for update to authenticated
using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active and p.role='admin'))
with check (recorded_by=auth.uid() and exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active and p.role='admin'));
create policy "mp_audit_read_active" on public.bf_media_procon_audit for select to authenticated
using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active));
