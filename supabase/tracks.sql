-- ── Tracks ─────────────────────────────────────────────────────
create table tracks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  sponsor     text,                        -- optional sponsor/contributor name
  cover_url   text,
  is_featured boolean not null default false,
  is_public   boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Track → Study join ─────────────────────────────────────────
create table track_studies (
  id         uuid primary key default gen_random_uuid(),
  track_id   uuid not null references tracks(id) on delete cascade,
  study_id   uuid not null references studies(id) on delete cascade,
  position   integer not null default 0,
  unique(track_id, study_id)
);

create index idx_track_studies_track on track_studies(track_id);
create index idx_track_studies_study on track_studies(study_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table tracks enable row level security;
alter table track_studies enable row level security;

-- Public read on public tracks
create policy "Public can read public tracks"
  on tracks for select using (is_public = true);

create policy "Authenticated can read all tracks"
  on tracks for select using (auth.role() = 'authenticated');

create policy "Public can read track_studies"
  on track_studies for select using (true);

-- Admin full access
create policy "Admins can manage tracks"
  on tracks for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can manage track_studies"
  on track_studies for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
