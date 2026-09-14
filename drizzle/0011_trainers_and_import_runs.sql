-- Formateurs: formal trainer identity with skills, availability, sync tracking
create table trainers (
  id uuid primary key default gen_random_uuid(),
  external_ref text unique, -- Google Sheets ID or partner ID; null for manual entries
  email text not null unique,
  full_name text not null,
  phone text,
  city text, -- 'Brazzaville', 'Pointe-Noire', or 'Brazzaville/Pointe-Noire'
  status text not null default 'actif', -- 'actif', 'inactif'
  source text not null, -- 'import', 'manuel'
  skills text[] default '{}', -- Array of skill names
  availability_windows jsonb default '[]'::jsonb, -- [{dayOfWeek: 0-6, startTime: "HH:MM", endTime: "HH:MM"}, ...]
  site text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz, -- When this record was last updated by a sync
  import_run_id uuid -- FK to import_runs
);

create index trainers_status_idx on trainers (status);
create index trainers_source_idx on trainers (source);
create index trainers_city_idx on trainers (city);
create index trainers_external_ref_idx on trainers (external_ref);

-- Import runs: audit log of sync operations
create table import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'google_sheets', 'xlsx_upload'
  actor_id uuid not null references staff(id) on delete set null,
  timestamp timestamptz not null default now(),
  status text not null, -- 'dry_run', 'committed', 'failed'
  counts jsonb not null, -- {created: N, updated: N, unchanged: N, rejected: N}
  error_report jsonb default '[]'::jsonb, -- [{row_num, issue, raw_row}, ...]
  sheet_hash text -- Hash of imported data to detect re-imports
);

create index import_runs_actor_idx on import_runs (actor_id);
create index import_runs_timestamp_idx on import_runs (timestamp);
create index import_runs_status_idx on import_runs (status);

--> statement-breakpoint

-- Add FK from trainers.import_run_id to import_runs
alter table trainers
  add constraint trainers_import_run_id_fk
  foreign key (import_run_id) references import_runs(id) on delete set null;
