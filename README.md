# Reckoning

Reckoning — Sunday check-in. Private. You vs you.

## Human setup (required for login + sync)

1. Create a free Supabase project named **reckoning**
2. Run `supabase/reckoning_p1.sql`
3. Enable Email auth; set Site URL + redirects (`https://proof-sand.vercel.app` and `http://localhost:3001/**`)
4. Copy Project URL + anon key into `.env.local` and Vercel env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
5. Redeploy / restart the dev server on port 3001

Full notes: [RECKONING_P1_SETUP.md](./RECKONING_P1_SETUP.md). Copy `.env.example` to `.env.local`. Never commit secrets.

Reckoning is a phone-first PWA for weekly Sunday body-progress check-ins: a required front photo, optional side photo, weight in kg, and a short note. Sign-in is required. Entries and photos sync to your private Supabase account (HTTPS, encrypted at rest, RLS so only you can read your rows). This device still caches `proof_entries` / `proof_photos` for offline speed. There is no public feed, no AI, and no paid auth vendor.

Run locally with `npm install` then `npx next dev -p 3001`, and open [http://localhost:3001](http://localhost:3001). Sign up, confirm email if prompted, then Capture → Timeline → Compare. Offline viewing of already-cached pages works after a production build (`npm run build && npm start`) once the service worker has cached the app; photos load from IndexedDB cache or a private storage download.
