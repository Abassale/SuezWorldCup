-- Suez Eau France Championship - Supabase schema
-- À coller dans Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

drop table if exists predictions cascade;
drop table if exists history cascade;
drop table if exists matches cascade;
drop table if exists app_users cascade;
drop table if exists teams cascade;

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo text not null default '💧',
  created_at timestamptz not null default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null unique,
  password_hash text not null,
  role text not null default 'player' check (role in ('player', 'admin')),
  favorite_winner text,
  team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  phase text not null default 'Group Stage',
  group_name text,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  home_score int,
  away_score int,
  penalty_home int,
  penalty_away int,
  match_date timestamptz not null,
  status text not null default 'NS',
  venue text,
  city text,
  updated_at timestamptz not null default now()
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  home_score int not null check (home_score >= 0),
  away_score int not null check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create table history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

-- Prototype interne : accès via la clé anon du frontend.
-- Pour un usage public large, il faudra ajouter un backend ou des policies RLS strictes.
alter table teams disable row level security;
alter table app_users disable row level security;
alter table matches disable row level security;
alter table predictions disable row level security;
alter table history disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Compte admin précréé.
-- pseudo : Admin
-- mot de passe : Admin
insert into app_users (pseudo, password_hash, role)
values ('Admin', 'c1c224b03cd9bc7b6a86d77f5dace40191766c485cd55dc48caf9ac873335d6f', 'admin')
on conflict (pseudo) do nothing;
