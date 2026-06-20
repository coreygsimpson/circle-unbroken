-- ============================================
-- BIBLE STUDY SYSTEM — SUPABASE SCHEMA
-- Run this entire script once in the SQL Editor
-- ============================================

-- 1. BOOKS TABLE
create table books (
  id uuid primary key default gen_random_uuid(),
  book_name text not null unique,
  testament text not null check (testament in ('Old Testament', 'New Testament')),
  genre text not null,
  total_chapters integer not null,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Complete')),
  book_order integer, -- 1 = Genesis ... 66 = Revelation, for sorting in canonical order
  created_at timestamptz default now()
);

-- 2. STUDIES TABLE
create table studies (
  id uuid primary key default gen_random_uuid(),
  study_id text not null unique, -- e.g. 'GEN-01-A'
  study_title text not null,
  book_id uuid references books(id) on delete restrict,
  passage_ref text,
  unit_type text check (unit_type in ('Chapter', 'Passage', 'Whole Book')),
  key_verse text,
  summary text,
  status text not null default 'Draft' check (status in ('Draft', 'Ready', 'Published')),
  media_link text,
  distribution text[], -- array, e.g. ARRAY['Personal','Group']
  week_number integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CROSS-REFERENCES TABLE
create table cross_references (
  id uuid primary key default gen_random_uuid(),
  label text, -- e.g. 'GEN-01 -> JHN-01'
  from_study_id uuid references studies(id) on delete cascade,
  to_study_id uuid references studies(id) on delete cascade,
  link_type text check (link_type in ('Thematic', 'Prophetic', 'Character', 'Word Study')),
  connection_note text,
  created_at timestamptz default now()
);

-- ============================================
-- HELPFUL INDEXES
-- ============================================
create index idx_studies_book_id on studies(book_id);
create index idx_studies_status on studies(status);
create index idx_xref_from on cross_references(from_study_id);
create index idx_xref_to on cross_references(to_study_id);

-- ============================================
-- ROW LEVEL SECURITY (locked down by default)
-- You're the only user right now, so we enable RLS
-- but allow full access via the service role key,
-- which you'll use from the app/admin side.
-- ============================================
alter table books enable row level security;
alter table studies enable row level security;
alter table cross_references enable row level security;

-- Allow read access to everyone for now (since content will be free/public)
create policy "Public read access on books" on books for select using (true);
create policy "Public read access on studies" on studies for select using (true);
create policy "Public read access on cross_references" on cross_references for select using (true);

-- Note: INSERT/UPDATE/DELETE are NOT allowed publicly.
-- You'll manage data via the Supabase Table Editor (using your own login),
-- which bypasses RLS automatically as the project owner.
