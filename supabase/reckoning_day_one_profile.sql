-- Reckoning day-one profile — run in the reckoning Supabase SQL editor.

create table if not exists public.reckoning_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('woman','man','non_binary','prefer_not')),
  height_cm double precision not null check (height_cm > 0),
  current_weight_kg double precision not null check (current_weight_kg > 0),
  target_weight_kg double precision not null check (target_weight_kg > 0),
  goal text not null check (goal in ('build','leaner','face','restart','track')),
  focus_areas text[] not null default '{}',
  activity text not null check (activity in ('sitting','light','train_few','train_hard')),
  onboarding_completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reckoning_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.reckoning_profiles;
drop policy if exists "profiles_insert_own" on public.reckoning_profiles;
drop policy if exists "profiles_update_own" on public.reckoning_profiles;

create policy "profiles_select_own" on public.reckoning_profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.reckoning_profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.reckoning_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
