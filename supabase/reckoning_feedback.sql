-- Reckoning Gemini feedback — run as a NEW query in the reckoning Supabase SQL editor.
-- Do not replace reckoning_p1.sql or reckoning_day_one_profile.sql.

create table if not exists public.reckoning_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  now_entry_id uuid not null references public.reckoning_entries (id) on delete cascade,
  then_entry_id uuid references public.reckoning_entries (id) on delete set null,
  prev_entry_id uuid references public.reckoning_entries (id) on delete set null,
  body text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, now_entry_id)
);

alter table public.reckoning_feedback enable row level security;

drop policy if exists "feedback_select_own" on public.reckoning_feedback;
drop policy if exists "feedback_insert_own" on public.reckoning_feedback;
drop policy if exists "feedback_update_own" on public.reckoning_feedback;
drop policy if exists "feedback_delete_own" on public.reckoning_feedback;

create policy "feedback_select_own" on public.reckoning_feedback
  for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.reckoning_feedback
  for insert with check (auth.uid() = user_id);
create policy "feedback_update_own" on public.reckoning_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "feedback_delete_own" on public.reckoning_feedback
  for delete using (auth.uid() = user_id);
