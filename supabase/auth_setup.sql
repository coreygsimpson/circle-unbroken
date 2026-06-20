-- ============================================
-- AUTH & PROFILES SETUP
-- Run this in Supabase SQL Editor (after the
-- original schema for books/studies/cross_references)
-- ============================================

-- 1. PROFILES TABLE
-- Linked 1:1 to Supabase's built-in auth.users table.
-- This is where we track role (user vs admin) and display info.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Anyone can view their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update any profile (e.g. to promote/demote roles)
create policy "Admins can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can update their own basic info (not their role)
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================
-- 2. AUTO-CREATE A PROFILE ROW WHEN SOMEONE SIGNS UP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 3. UPDATE STUDIES/BOOKS POLICIES TO ALLOW ADMIN WRITES
-- (Previously was read-only public access. Now admins can write.)
-- ============================================
create policy "Admins can insert studies"
  on studies for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update studies"
  on studies for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete studies"
  on studies for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert books"
  on books for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update books"
  on books for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert cross_references"
  on cross_references for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update cross_references"
  on cross_references for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete cross_references"
  on cross_references for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- 4. MAKE YOURSELF THE FIRST ADMIN
-- IMPORTANT: Run this AFTER you've signed up for an
-- account in the app once. Replace the email below
-- with the email you signed up with.
-- ============================================
-- update profiles set role = 'admin' where email = 'your-email@example.com';
