-- PQC Lab pilot database. Pseudonymous by design: students have no names or
-- e-mail addresses here, only a random pseudonym and a hashed sign-in code.
create extension if not exists pgcrypto;

create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  role          text not null check (role in ('student', 'teacher', 'researcher')),
  class_id      uuid references classes(id),
  pseudonym     text not null unique,
  code_hash     text unique,                     -- students: sha256(pepper || sign-in code)
  email         text unique,                     -- staff only
  password_hash text,                            -- staff only (scrypt)
  arm           text check (arm in ('T', 'C')),  -- students only
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_seen     timestamptz
);

create table if not exists sessions (
  id          text primary key,                  -- sha256 of the cookie value
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists sessions_user on sessions(user_id);

create table if not exists learner_state (
  user_id     uuid primary key references users(id) on delete cascade,
  state       jsonb not null,
  version     integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- The research record. Append-only: rows can be added, never changed.
-- Rows are deleted only by scripts/withdraw.js when a participant withdraws.
create table if not exists events (
  id          bigserial primary key,
  user_id     uuid references users(id) on delete cascade,
  class_id    uuid,
  t           timestamptz not null default now(),
  source      text not null check (source in ('server', 'client')),
  type        text not null,
  lesson      text,
  payload     jsonb not null default '{}'
);
create index if not exists events_user_t on events(user_id, t);
create index if not exists events_class_type on events(class_id, type);

create or replace function pqc_events_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pqc.withdrawal', true), '') = 'on' then
    return old;
  end if;
  raise exception 'events are append-only';
end $$;
drop trigger if exists events_append_only on events;
create trigger events_append_only before update or delete on events
  for each row execute function pqc_events_guard();
