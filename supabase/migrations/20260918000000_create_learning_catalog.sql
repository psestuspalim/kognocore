create table public.learning_catalog (
  id text primary key,
  kind text not null check (kind in ('Course', 'Subject', 'Folder')),
  course_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_catalog_kind_course_idx
  on public.learning_catalog (kind, course_id);

alter table public.learning_catalog enable row level security;
revoke all on public.learning_catalog from anon, authenticated;
