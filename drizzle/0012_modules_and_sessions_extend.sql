-- Modules: formal module definition with prerequisites and required skills
create table modules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  duration_hours numeric(5, 1) not null,
  description text,
  max_learners integer,
  required_skills text[] default '{}', -- Array of skill names required for trainers
  prerequisites uuid[] default '{}', -- Array of module IDs that must complete first
  program_id uuid not null references programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, code)
);

create index modules_program_idx on modules (program_id);

--> statement-breakpoint

-- Extend sessions table: add moduleId FK and status
alter table sessions
  add column module_id uuid references modules(id) on delete set null,
  add column status text default 'planifiée', -- 'planifiée', 'confirmée', 'réalisée', 'annulée'
  add column room_location text,
  add column canceled_reason text;

create index sessions_status_idx on sessions (status);
create index sessions_module_idx on sessions (module_id);
