# Reckoning day-one onboarding

Run this in the **reckoning** Supabase SQL editor after P1 tables exist:

1. Open the reckoning project → SQL Editor
2. Paste and run `supabase/reckoning_day_one_profile.sql`
3. Confirm table `public.reckoning_profiles` exists with RLS on
4. Restart `npx next dev -p 3001` or redeploy

New accounts are sent through Welcome → Done before Home/Capture. Returning users with a profile row skip it.

No under-18 block. AI photo analysis is not part of this pack.
