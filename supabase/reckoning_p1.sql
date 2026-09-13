-- Reckoning P1 — private entries + private photo bucket
-- Run in the Supabase SQL editor of a dedicated project named "reckoning".

create table if not exists public.reckoning_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  weight_kg double precision not null check (weight_kg > 0),
  note text,
  has_front boolean not null default true,
  has_side boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists reckoning_entries_user_created_idx
  on public.reckoning_entries (user_id, created_at desc);

alter table public.reckoning_entries enable row level security;

drop policy if exists "entries_select_own" on public.reckoning_entries;
drop policy if exists "entries_insert_own" on public.reckoning_entries;
drop policy if exists "entries_update_own" on public.reckoning_entries;
drop policy if exists "entries_delete_own" on public.reckoning_entries;

create policy "entries_select_own" on public.reckoning_entries
  for select using (auth.uid() = user_id);
create policy "entries_insert_own" on public.reckoning_entries
  for insert with check (auth.uid() = user_id);
create policy "entries_update_own" on public.reckoning_entries
  for update using (auth.uid() = user_id);
create policy "entries_delete_own" on public.reckoning_entries
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('reckoning-photos', 'reckoning-photos', false)
on conflict (id) do nothing;

drop policy if exists "photos_select_own" on storage.objects;
drop policy if exists "photos_insert_own" on storage.objects;
drop policy if exists "photos_update_own" on storage.objects;
drop policy if exists "photos_delete_own" on storage.objects;

-- Path convention: {user_id}/{entry_id}/front.jpg and .../side.jpg
create policy "photos_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reckoning-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reckoning-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reckoning-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reckoning-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
