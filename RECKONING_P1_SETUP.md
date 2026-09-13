# Reckoning P1 setup

Do these once so login and private photo sync work.

1. Create a free Supabase project named **reckoning** (keep Fitness OS in its own project).
2. Run `supabase/reckoning_p1.sql` in the Supabase SQL editor.
3. Auth → Providers → enable **Email**. Turn **Confirm email** ON for production trust (turn OFF only if you need the fastest local test).
4. Auth → URL configuration:
   - Site URL: `https://proof-sand.vercel.app`
   - Redirect URLs: `https://proof-sand.vercel.app/**` and `http://localhost:3001/**`
5. Copy **Project URL** and the **anon / public** key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Add the same two values in Vercel → Environment Variables for Production and Preview.
6. Restart the dev server on port 3001 (`npx next dev -p 3001`) or redeploy on Vercel.

Trust model (what we actually ship): HTTPS in transit, Supabase encryption at rest, Row Level Security so a user can only read/write their own rows and `reckoning-photos` objects, no public buckets, photos fetched with authenticated download (never public object URLs). Client-side end-to-end crypto is not in this pass.
