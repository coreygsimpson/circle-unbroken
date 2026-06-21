create table guest_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label      text,                                          -- e.g. "Smith Family", "Sunday School"
  track_id   uuid references tracks(id) on delete set null, -- optional auto-redirect
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

alter table guest_codes enable row level security;

-- Anyone can validate a specific code (needed for guest login)
create policy "Anyone can read guest codes"
  on guest_codes for select using (true);

-- Only admins can manage codes
create policy "Admins can manage guest codes"
  on guest_codes for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
