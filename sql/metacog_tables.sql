-- Metacog Lab persistence tables (Supabase/Postgres)
-- Run in SQL Editor before using /api/metacog in production.

create table if not exists public.metacog_questions (
  id text primary key,
  payload jsonb not null,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.metacog_sessions (
  id text primary key,
  payload jsonb not null,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.metacog_analyses (
  id text primary key,
  payload jsonb not null,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create index if not exists idx_metacog_questions_created on public.metacog_questions (created_date desc);
create index if not exists idx_metacog_sessions_created on public.metacog_sessions (created_date desc);
create index if not exists idx_metacog_analyses_created on public.metacog_analyses (created_date desc);

create index if not exists idx_metacog_analyses_learner on public.metacog_analyses ((payload->>'learner_id'));
create index if not exists idx_metacog_analyses_email on public.metacog_analyses ((payload->>'user_email'));
create index if not exists idx_metacog_analyses_session on public.metacog_analyses ((payload->>'session_id'));
create index if not exists idx_metacog_analyses_quiz on public.metacog_analyses ((payload->>'source_quiz_id'));
