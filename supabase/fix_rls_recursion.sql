-- ============================================
-- FIX: Infinite recursion in profiles RLS policies
-- The "Admins can view/update" policies queried profiles
-- from within a policy ON profiles, causing recursion (500 errors).
-- This replaces them with a safe helper function.
-- ============================================

-- 1. Drop the broken recursive policies
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update profiles" on profiles;

-- 2. Create a helper function that checks admin status
--    WITHOUT triggering RLS (security definer bypasses RLS
--    inside the function body)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 3. Recreate the policies using the safe function instead
create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

create policy "Admins can update profiles"
  on profiles for update
  using (public.is_admin());

-- 4. Also fix the same recursion risk in studies/books/cross_references
-- policies, which had the identical pattern querying profiles inline.
-- These technically queried a DIFFERENT table (profiles, from within
-- a policy on studies/books) so they were not recursive, but let's
-- standardize on the safe function for consistency and performance.

drop policy if exists "Admins can insert studies" on studies;
drop policy if exists "Admins can update studies" on studies;
drop policy if exists "Admins can delete studies" on studies;
drop policy if exists "Admins can insert books" on books;
drop policy if exists "Admins can update books" on books;
drop policy if exists "Admins can insert cross_references" on cross_references;
drop policy if exists "Admins can update cross_references" on cross_references;
drop policy if exists "Admins can delete cross_references" on cross_references;

create policy "Admins can insert studies" on studies for insert with check (public.is_admin());
create policy "Admins can update studies" on studies for update using (public.is_admin());
create policy "Admins can delete studies" on studies for delete using (public.is_admin());

create policy "Admins can insert books" on books for insert with check (public.is_admin());
create policy "Admins can update books" on books for update using (public.is_admin());

create policy "Admins can insert cross_references" on cross_references for insert with check (public.is_admin());
create policy "Admins can update cross_references" on cross_references for update using (public.is_admin());
create policy "Admins can delete cross_references" on cross_references for delete using (public.is_admin());
