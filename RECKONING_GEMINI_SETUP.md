# Reckoning Gemini feedback

Human setup after onboarding + P1 tables exist. New SQL — do not replace older scripts.

## 1. Database

1. Open the **reckoning** Supabase project → SQL Editor
2. New query: paste and run `supabase/reckoning_feedback.sql`
3. Confirm table `public.reckoning_feedback` exists with RLS on

## 2. Gemini API key (server only)

1. Open [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Local: add to `.env.local` (never commit the real key)

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

`GEMINI_MODEL` is optional. Default is `gemini-3.5-flash-lite` (cheap vision). Override if Google renames models.

4. Vercel → Project → Settings → Environment Variables
   - `GEMINI_API_KEY` — Production **and** Preview, server/secret only
   - Optional `GEMINI_MODEL` the same way
   - Do **not** prefix with `NEXT_PUBLIC_`
5. Redeploy so the server sees the key
6. Restart local `npx next dev` after changing `.env.local`

## 3. What you should see

- First check-in → baseline copy, no Gemini call
- Second check-in → full feedback screen (Gemini, then cached)
- Same `now` entry again → cached row, no second charge
- Missing key or API fail → fallback text; check-in still in Timeline

Photos are sent from the Reckoning server to Gemini over HTTPS. The key never ships in the phone/browser bundle.

## 4. Honesty + period

- Never invent gains on the same photo or same day. Hype is OK; fake thicker chest/shoulders are not.
- Feedback always names the real gap (`same day`, `6 days`, `about 1 year`) — never rounds a same-day pair up to “1 week”.
- After deploy, clear a bad cached line: Supabase → `reckoning_feedback` → delete that user’s row for the check-in, **or** open `/feedback?now=<entry-id>&regenerate=1`.
