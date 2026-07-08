-- Fix study_notes.study_id type: was uuid referencing studies.id,
-- should be text referencing studies.study_id (the human-readable PK like 'JHN-01-A').
-- Safe to drop/recreate — table is new and has no production data.

drop table if exists study_notes;

create table study_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  study_id     text not null references studies(study_id) on delete cascade,
  content      text not null default '',
  updated_at   timestamptz not null default now(),
  unique (user_id, study_id)
);

alter table study_notes enable row level security;

create policy "Users can read their own notes"
  on study_notes for select using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on study_notes for insert with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on study_notes for update using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on study_notes for delete using (auth.uid() = user_id);
