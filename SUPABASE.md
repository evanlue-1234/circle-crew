# Crew — Building the Supabase Backend

*A teacher-style walkthrough for standing up a real backend for Crew. You'll create a
Supabase project, wire it into your Vite app, and design the database for circles, plans,
swipes, and votes — with Row Level Security so users can only see their own data.*

---

## 0. The mental model

Right now your app has no memory — when you "log in," nothing is checked, and when you
create a circle, it vanishes on refresh. Supabase fixes this by giving you three things in
one hosted package:

1. **A Postgres database** — where your data lives (circles, members, plans, ideas, votes).
2. **Authentication** — real sign-up / sign-in / password reset, with sessions.
3. **Instant API** — every table you create is automatically queryable from your React code
   via the `@supabase/supabase-js` library. No backend server to write.

Think of it as "Firebase, but it's just Postgres." You design tables; Supabase gives you a
typed client that reads and writes them.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Create an **organization**, then **New project**. Name it `crew`, pick a strong database
   password (save it somewhere safe — you won't need it often, but you can't recover it), and
   choose a region near you (for Raleigh, `US East 1`).
3. Wait ~2 minutes for it to provision.

---

## 2. Grab your project URL + publishable key

In the dashboard: **Project Settings (gear) → API Keys**.

- **Project URL:** looks like `https://abcdefgh.supabase.co`
- **Publishable key:** starts with `sb_publishable_...` — this is the *public* key that's safe
  to ship in your browser app. (Supabase renamed the old "anon" key to "publishable"; the
  legacy keys are deprecated by end of 2026. The **secret key** is different — never put it in
  client code, it bypasses all security.)

---

## 3. Wire it into your app

Install the client:

```bash
npm install @supabase/supabase-js
```

Copy the env template and fill it in:

```bash
cp .env.example .env.local
# then edit .env.local and paste your URL + publishable key
```

`.env.local` should end up looking like:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx
```

Create the client — `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
```

> Vite only exposes env vars prefixed with `VITE_` to the browser, and `.gitignore` already
> covers `.env.local`, so your key stays out of git.

---

## 4. Turn on Email/Password auth

In the dashboard: **Authentication → Providers → Email**. Make sure it's **enabled**. For
local dev, also disable "Confirm email" under **Authentication → Settings** so you can test
sign-ups without a real inbox (turn it back on before launch).

Now you can use real auth in React:

```ts
import { supabase } from './lib/supabase'

// Sign up
await supabase.auth.signUp({ email, password, options: { data: { name } } })

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Get the current session / user
const { data: { session } } = await supabase.auth.getSession()
const { data: { user } } = await supabase.auth.getUser()

// React to login/logout
supabase.auth.onAuthStateChange((_event, session) => {
  // session is null when logged out
})
```

You can now make your `LoginScreen` actually call `signInWithPassword`, and your
`SignupScreen` call `signUp`. A "forgot password" link calls
`supabase.auth.resetPasswordForEmail(email)` — you'll also configure the redirect URL in
**Authentication → URL Configuration** so the reset email points back to your app.

---

## 5. Design the database (the Crew data model)

Run SQL in the dashboard's **SQL Editor → New query**. This is a starter schema — enough to
make the core loop real. (SQL is the language Postgres speaks; Supabase gives you a box to
paste it into and a Run button.)

```sql
-- 1) PROFILES: one row per user, linked to auth.users
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  city        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- 2) CIRCLES: a friend group
create table public.circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz default now()
);

-- 3) CIRCLE MEMBERS: who's in which circle + rotation status
create table public.circle_members (
  circle_id   uuid references public.circles (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  status      text default 'active',      -- active | paused
  captain_order int,                      -- rotation order; null = recently led
  joined_at   timestamptz default now(),
  primary key (circle_id, user_id)
);

-- 4) PLANS: a planning cycle within a circle
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid references public.circles (id) on delete cascade,
  title       text,
  status      text default 'collecting',  -- collecting | voting | rsvp | confirmed | cancelled
                                           -- (renamed from draft/dropped past in migration 0011)
  captain_id  uuid references public.profiles (id),  -- this cycle's plan captain
  event_date  date,
  created_at  timestamptz default now()
);

-- 5) IDEAS: activity options for a plan (user-submitted or app-recommended)
create table public.ideas (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid references public.plans (id) on delete cascade,
  title       text not null,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz default now()
);

-- 6) SWIPES: each member's reaction to an idea
create table public.swipes (
  idea_id     uuid references public.ideas (id) on delete cascade,
  user_id     uuid references public.profiles (id),
  direction   text not null,               -- like | dislike | skip
  created_at  timestamptz default now(),
  primary key (idea_id, user_id)
);

-- 7) VOTES: the final two-option vote
create table public.votes (
  plan_id     uuid references public.plans (id) on delete cascade,
  user_id     uuid references public.profiles (id),
  idea_id     uuid references public.ideas (id),
  created_at  timestamptz default now(),
  primary key (plan_id, user_id)
);
```

---

## 6. Row Level Security — the most important part

RLS is the rule engine that says "a user can only see rows they're allowed to." It's
enforced in the database itself — so even if someone opens your app's URL and pokes at the
API, they still can't read other people's circles. **This is what makes the publishable key
safe to ship in the browser.**

First, a helper function so policies can ask "is this user a member of this circle?":

```sql
create or replace function public.is_circle_member(circle uuid, user uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = circle and user_id = user and status = 'active'
  );
$$;
```

Then enable RLS and write policies. Example for `circles` (a member can read any circle they
belong to; the creator can insert one):

```sql
alter table public.circles enable row level security;

create policy "members can read their circles"
  on public.circles for select to authenticated
  using (public.is_circle_member(id, auth.uid()));

create policy "anyone authenticated can create a circle"
  on public.circles for insert to authenticated
  with check (auth.uid() = created_by);
```

And for `circle_members` (members can see who's in their circles):

```sql
alter table public.circle_members enable row level security;

create policy "members can read their circle's members"
  on public.circle_members for select to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));
```

> **Teaching point:** `auth.uid()` is a built-in Supabase function that returns the current
> logged-in user's id. Every policy is essentially "allow this operation if `<condition>` is
> true," and `auth.uid()` is how you tie rows to the current user.

You'll write similar policies for `plans`, `ideas`, `swipes`, and `votes` — each scoped so
only members of the circle the plan belongs to can read or write. The pattern is the same;
copy the `circles` example and swap the table + condition.

---

## 7. Auto-create a profile when someone signs up

When a user signs up, you want a row in `profiles` with their `id`. Use a database trigger
(it runs automatically when a new auth user is created):

```sql
create function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, city)
  values (new.id, new.raw_user_meta_data->>'name', null);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 8. Read and write data from React

Now the magic — your client can query these tables directly:

```ts
import { supabase } from './lib/supabase'

// Circles I belong to
const { data: circles } = await supabase
  .from('circles')
  .select('id, name, city, created_at')
  .order('created_at', { ascending: false })

// Insert a new circle
await supabase.from('circles').insert({
  name: 'College Crew',
  city: 'Raleigh, NC',
  created_by: user.id,
})

// Ideas for a plan
const { data: ideas } = await supabase
  .from('ideas')
  .select('id, title').eq('plan_id', planId)

// Record a swipe
await supabase.from('swipes').upsert({
  idea_id: ideaId, user_id: user.id, direction: 'like'
})
```

RLS silently filters everything: the `circles` query above only ever returns circles the
current user is a member of, because of the policy you wrote — no extra code needed.

---

## 9. Where this fits in your roadmap

This is Phase 3 of the build. Before this, you'll have converted the **login**, **signup**,
and **home** screens into real React components and added React Router. Then:

1. Create the Supabase project + client (this guide).
2. Build real auth (login calls `signInWithPassword`, etc.).
3. Create the tables + RLS (Sections 5–7).
4. Replace the mock data on the Home screen with a real query to `circles`.
5. Build the next feature slice: create a circle → invite members → it appears on Home.

Work in vertical slices — get one path fully working end-to-end (sign up → create a circle →
see it on Home) before wiring the swipe/vote flow.

---

## Quick checklist

- [ ] Supabase project created at supabase.com
- [ ] Copied Project URL + publishable key into `.env.local`
- [ ] `npm install @supabase/supabase-js`
- [ ] `src/lib/supabase.ts` created with `createClient(...)`
- [ ] Email provider enabled (Confirm email off for dev)
- [ ] Ran the schema SQL (Section 5) in SQL Editor
- [ ] RLS policies + helper function + signup trigger (Sections 6–7)
- [ ] Login screen calls `signInWithPassword`
- [ ] Home screen fetches real `circles`

You now have a real backend. The "movie set" has plumbing.
