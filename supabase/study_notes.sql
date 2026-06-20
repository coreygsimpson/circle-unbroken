-- Study notes: one note per user per study, upserted on save
create table if not exists study_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  study_id     uuid not null references studies(id) on delete cascade,
  content      text not null default '',
  updated_at   timestamptz not null default now(),
  unique (user_id, study_id)
);

-- RLS
alter table study_notes enable row level security;

create policy "Users can read their own notes"
  on study_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on study_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on study_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on study_notes for delete
  using (auth.uid() = user_id);
