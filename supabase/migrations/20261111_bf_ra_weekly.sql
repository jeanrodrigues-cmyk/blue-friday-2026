-- Reclame Aqui: registros semanais isolados das demais areas
create table if not exists public.bf_ra_weekly (
  week_start date primary key,
  week_end date not null,
  assigned integer check (assigned >= 0),
  answered integer check (answered >= 0),
  evaluated integer check (evaluated >= 0),
  good_evaluations integer check (good_evaluations >= 0),
  evaluation_pct numeric(7,2) check (evaluation_pct between 0 and 100),
  good_pct numeric(7,2) check (good_pct between 0 and 100),
  overdue_15_count integer check (overdue_15_count >= 0),
  contact_d1_ok boolean,
  first_action_d1_ok boolean,
  reputation_stable boolean,
  vfn_stable boolean,
  solution_stable boolean,
  reward_approved boolean not null default false,
  gift_approved boolean not null default false,
  source text not null default 'HugMe',
  notes text,
  updated_at timestamptz not null default now(),
  constraint ra_week_dates check (week_end >= week_start)
);
create table if not exists public.bf_ra_weekly_people (
  week_start date not null references public.bf_ra_weekly(week_start) on delete cascade,
  member_key text not null check (member_key in ('julio','larissa')),
  assigned integer check (assigned >= 0),
  answered integer check (answered >= 0),
  replies integer check (replies >= 0),
  evaluated integer check (evaluated >= 0),
  good_evaluations integer check (good_evaluations >= 0),
  resolved integer check (resolved >= 0),
  vfn_positive integer check (vfn_positive >= 0),
  evaluation_pct numeric(7,2),
  good_pct numeric(7,2),
  solution_pct numeric(7,2),
  reputation numeric(7,2),
  primary key(week_start,member_key)
);
alter table public.bf_ra_weekly enable row level security;
alter table public.bf_ra_weekly_people enable row level security;
drop policy if exists ra_weekly_read on public.bf_ra_weekly;
create policy ra_weekly_read on public.bf_ra_weekly for select to authenticated using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists ra_people_read on public.bf_ra_weekly_people;
create policy ra_people_read on public.bf_ra_weekly_people for select to authenticated using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true));
drop policy if exists ra_weekly_admin on public.bf_ra_weekly;
create policy ra_weekly_admin on public.bf_ra_weekly for all to authenticated using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')) with check (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
drop policy if exists ra_people_admin on public.bf_ra_weekly_people;
create policy ra_people_admin on public.bf_ra_weekly_people for all to authenticated using (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin')) with check (exists (select 1 from public.bf_profiles p where p.user_id=auth.uid() and p.active=true and p.role='admin'));
insert into public.bf_ra_weekly(week_start,week_end,assigned,answered,evaluated,good_evaluations,evaluation_pct,good_pct,source,notes)
values ('2026-11-01','2026-11-08',68,68,35,13,51.47,37.14,'HugMe','Relatorio filtrado 02 a 08/11; travas pendentes de verificacao')
on conflict (week_start) do nothing;
insert into public.bf_ra_weekly_people(week_start,member_key,assigned,answered,replies,evaluated,good_evaluations,resolved,vfn_positive,evaluation_pct,good_pct,solution_pct,reputation)
values
('2026-11-01','julio',34,37,1,18,8,12,9,48.65,44.44,66.67,6.64),
('2026-11-01','larissa',34,31,13,8,3,6,4,25.81,37.50,75.00,null)
on conflict (week_start,member_key) do nothing;
