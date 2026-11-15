-- Topdik-KU: Supabase SQL Editor da BIR MARTA ishga tushiring

create table if not exists app_state (
  id text primary key default 'main',
  items jsonb not null default '[]'::jsonb,
  users jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  notifications jsonb not null default '[]'::jsonb,
  collects jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into app_state (id) values ('main')
on conflict (id) do nothing;

-- Public read/write for demo (production da RLS ni qat'iyroq qiling)
alter table app_state enable row level security;

drop policy if exists "public read app_state" on app_state;
drop policy if exists "public write app_state" on app_state;

create policy "public read app_state" on app_state
  for select using (true);

create policy "public write app_state" on app_state
  for all using (true) with check (true);
