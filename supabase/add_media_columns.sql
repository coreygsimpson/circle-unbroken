-- Add Cloudflare video UID (for API calls) and audio link to studies
alter table studies
  add column if not exists cf_video_uid text,
  add column if not exists audio_link   text;

-- Supabase Storage bucket for audio-only uploads (when no video exists yet)
-- Run this separately in the SQL editor or Storage dashboard
insert into storage.buckets (id, name, public)
values ('study-audio', 'study-audio', true)
on conflict (id) do nothing;

-- RLS: any authenticated user can read audio files
create policy "Authenticated users can read audio"
  on storage.objects for select
  using (bucket_id = 'study-audio' and auth.role() = 'authenticated');

-- Only admins can upload audio
create policy "Admins can upload audio"
  on storage.objects for insert
  with check (
    bucket_id = 'study-audio'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete audio"
  on storage.objects for delete
  using (
    bucket_id = 'study-audio'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
