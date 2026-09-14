-- Affectations: trainer assignments to sessions with role and status tracking
create table affectations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete cascade,
  role text not null, -- 'titulaire', 'suppléant'
  status text not null default 'proposé', -- 'proposé', 'confirmé', 'refusé'
  status_history jsonb default '[]'::jsonb, -- [{status, changedAt, changedBy}, ...]
  conflict_reason text, -- Why was it rejected
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  refused_at timestamptz,
  unique(session_id, trainer_id, role)
);

create index affectations_session_idx on affectations (session_id);
create index affectations_trainer_idx on affectations (trainer_id);
create index affectations_status_idx on affectations (status);
