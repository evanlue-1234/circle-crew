# Task: Integrate Supabase + Eventbrite (Google Places deferred)

*Instructions for Claude Code. Paste this whole file into a Claude Code session running in
the `crew-starter/` project root. Work in vertical slices — finish one end-to-end path before
starting the next — and run `npm run build` to verify after each slice.*

---

## Context

You're working on **Crew**, a React + Vite + TypeScript app. It's currently a clickable
prototype: 22 screens rendered as HTML strings (`src/screens.json`) via `dangerouslySetInnerHTML`,
with a hand-rolled `data-nav` route state machine in `App.tsx`.

**Read these three files first and follow them:**
- `CLAUDE.md` — project context, architecture, navigation system, design tokens, conventions
- `SUPABASE.md` — full Supabase setup: client, auth, the Crew database schema, RLS policies,
  the auto-create-profile trigger (the SQL you need is in Sections 5–7)
- `APIS.md` — Google Places + Eventbrite key setup and the Edge Function security pattern

**What I (the user) have already done:**
- Created a Supabase project. I have the **Project URL** and **publishable key** (`sb_publishable_…`).
- Created an Eventbrite account and obtained a **private token**.

**Scope of this task:** wire up Supabase (auth + database) and Eventbrite as a data source
that populates the swipe deck. **Google Places API is a non-MVP feature — do NOT implement it
now.** Just structure the code so it can be added later as another Edge Function.

---

## Slice 1 — Supabase client + environment

1. `npm install @supabase/supabase-js`
2. Create `.env.local` (copy from `.env.example`) and fill in:
   ```
   VITE_SUPABASE_URL=https://<my-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…my key…
   ```
3. Create `src/lib/supabase.ts` exporting a singleton `supabase` client (see SUPABASE.md §3).
4. Confirm `.env.local` is in `.gitignore` (it already is) — never commit it.

Verify: `npm run dev` runs, no console errors, the client is importable.

---

## Slice 2 — Real authentication

1. In the Supabase dashboard, enable **Email/Password** under Authentication → Providers, and
   turn **Confirm email OFF** for local dev (I'll re-enable before launch).
2. Convert the **login** and **signup** screens from HTML strings into real React components
   (`src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`). **Keep the existing class
   names and markup** so `src/styles/app.css` still applies — only add state and event handlers.
3. Wire them to real auth:
   - Signup → `supabase.auth.signUp({ email, password, options: { data: { name } } })`
   - Login → `supabase.auth.signInWithPassword({ email, password })`
   - On error, show the message in the existing error UI; on success, navigate to Home.
4. Create an auth context (React context or Zustand) holding the current `session`/`user`,
   subscribed via `supabase.auth.onAuthStateChange`. If no session, the app shows Login.
5. Add a "Forgot password?" link on Login that calls
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: <app url> })`. A full reset-password
   screen can come later — for now just wire the call and show a "check your email" message.
6. Add a Sign Out button on the Profile screen → `supabase.auth.signOut()`.

Verify: I can sign up, get logged in, and sign out. Refreshing keeps me logged in (session
persists). Logged-out users can't see Home.

---

## Slice 3 — Database schema + RLS + profile trigger

1. In the Supabase **SQL Editor**, run the schema SQL from SUPABASE.md §5 (tables: `profiles`,
   `circles`, `circle_members`, `plans`, `ideas`, `swipes`, `votes`).
2. Run the `is_circle_member(...)` helper + the RLS policies from SUPABASE.md §6 for `circles`
   and `circle_members`. Add equivalent policies for `plans`, `ideas`, `swipes`, `votes` so
   that only members of the circle a plan belongs to can read/write them.
3. Run the `handle_new_user()` trigger from SUPABASE.md §7 so a `profiles` row is created on
   signup (seed the `name` from `raw_user_meta_data`).

Verify: signing up creates a `profiles` row; the Supabase table editor shows it; RLS blocks
anonymous reads (a query with no session returns nothing).

---

## Slice 4 — Real data on Home + create a circle

1. Convert the **Home** screen into a real component. Replace the mock circle cards with a
   live query: `supabase.from('circles').select('id,name,city,created_at')` — RLS returns only
   circles the user belongs to.
2. Build the create-circle slice (Setup → Invite → Circle Hub screens as real components):
   - Insert a new row in `circles` (`created_by` = current user id).
   - Insert the creator as a `circle_members` row (`status='active'`).
   - Invite screen: capture emails/names of friends to add as members later (storing a pending
     invite is fine for MVP; real invite-by-link is a future feature).
3. The new circle appears on Home after creation.

Verify: I can create a circle and it persists across refresh.

---

## Slice 5 — Eventbrite as a data source for the swipe deck

**Security rule (from APIS.md §0): the Eventbrite private token is a secret — it must NEVER
be in a `VITE_` env var or client code. Store it as a Supabase secret and call it from an
Edge Function.**

1. Set the secret (I'll run this; you write the function):
   ```bash
   supabase secrets set EVENTBRITE_API_KEY=<my private token>
   ```
2. Create a Supabase Edge Function `supabase/functions/eventbrite/index.ts` that:
   - Reads the token from `Deno.env.get('EVENTBRITE_API_KEY')`.
   - Accepts a request body with `{ location, date_range, circle_id }`.
   - Calls the Eventbrite v3 API with `Authorization: Bearer <token>` at
     `https://www.eventbriteapi.com/v3/…`. Consult the Eventbrite API docs to pick the right
     endpoint for **public events near a location/date**; start with `GET /v3/users/me/` to
     resolve my organization id if needed.
   - Returns a clean, typed list of `{ title, url, start, venue, image_url }` events.
3. Deploy it: `supabase functions deploy eventbrite`.
4. Call it from React via `supabase.functions.invoke('eventbrite', { body: {...} })`.
5. **Populate the swipe deck:** when a captain starts a plan, call the Edge Function, then
   insert the returned events as rows in the `ideas` table for that plan
   (`created_by` = system/app, or null). The swipe deck (Task 12 screen) reads from `ideas` and
   writes each member's reaction to `swipes`. RLS ensures only circle members see them.

Verify: starting a plan pulls real local events from Eventbrite into the swipe deck, and
swipes are recorded per user.

---

## Explicitly deferred — Google Places API (non-MVP)

Do **not** implement Google Places in this task. It's deferred to a later milestone. Just:
- Keep `APIS.md` as the reference for when it's added.
- Structure the Edge Function layer so a future `places` function can sit beside `eventbrite`
  and feed the same `ideas` table the same way. No code needed now — just don't block that path.

---

## Constraints (from CLAUDE.md — follow these)

- **Mobile-first.** Build for the phone; desktop shows the framed view.
- **Preserve design tokens.** Use the CSS variables in `src/styles/app.css`; don't hardcode colors.
- When converting a screen from an HTML string to a `.tsx` component, keep the markup and class
  names so the existing CSS still covers it — then add state/props.
- Vite `base: "./"` is already set — don't change it.
- **Run `npm run build` after each slice** and fix any type errors before moving on.
- Work in vertical slices: get one path fully working end-to-end before the next.

## Order of execution

Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5. After each, run `npm run build` and tell me
what to test. Pause for my confirmation before starting the next slice.
