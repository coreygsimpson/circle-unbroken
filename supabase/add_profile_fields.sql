-- Extend profiles table with community-ready fields
alter table profiles
  add column if not exists display_name text,
  add column if not exists avatar_url   text,
  add column if not exists bio          text;

-- Avatars storage bucket (public so images render in <img> tags)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone authenticated can read avatars
create policy "Authenticated users can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Users can only upload/update/delete their own avatar (file path starts with their user ID)
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
