-- Study Seeds — early-stage research and notes that may become full studies
create table study_seeds (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text,                        -- free-form notes, markdown friendly
  bible_refs   text,                        -- e.g. "John 3:16, Romans 8:28-30"
  tags         text[] default '{}',         -- e.g. ARRAY['grace','salvation']
  status       text not null default 'seed'
                 check (status in ('seed', 'draft', 'ready')),
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table study_seeds enable row level security;

-- Admins can do everything
create policy "Admins can manage study seeds"
  on study_seeds for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- All authenticated users can read seeds
create policy "Authenticated users can read study seeds"
  on study_seeds for select
  using (auth.role() = 'authenticated');
