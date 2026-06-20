-- Add Cloudflare video UID (for API calls) and audio link to studies
alter table studies
  add column if not exists cf_video_uid text,
  add column if not exists audio_link   text;

-- Supabase Storage buckets
insert into storage.buckets (id, name, public)
values ('study-audio', 'study-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('study-slides', 'study-slides', true)
on conflict (id) do nothing;

-- RLS: any authenticated user can read audio and slides
create policy "Authenticated users can read audio"
  on storage.objects for select
  using (bucket_id = 'study-audio' and auth.role() = 'authenticated');

create policy "Authenticated users can read slides"
  on storage.objects for select
  using (bucket_id = 'study-slides' and auth.role() = 'authenticated');

-- Only admins can upload/delete
create policy "Admins can upload audio"
  on storage.objects for insert
  with check (
    bucket_id = 'study-audio'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete audio"
  on storage.objects for delete
  using (
    bucket_id = 'study-audio'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can upload slides"
  on storage.objects for insert
  with check (
    bucket_id = 'study-slides'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete slides"
  on storage.objects for delete
  using (
    bucket_id = 'study-slides'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
