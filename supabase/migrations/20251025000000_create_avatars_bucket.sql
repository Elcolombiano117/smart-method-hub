-- Create public avatars bucket and RLS policies
-- This migration is idempotent for bucket creation.

begin;

-- Create bucket if not exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS policies for storage.objects on 'avatars'
-- Public read
create policy if not exists "Public read avatars"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder (auth.uid())
create policy if not exists "Users can upload own avatars"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Authenticated users can update their own files
create policy if not exists "Users can update own avatars"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Authenticated users can delete their own files
create policy if not exists "Users can delete own avatars"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

commit;