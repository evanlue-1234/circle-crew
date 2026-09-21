-- Crew database schema + RLS.
-- Paste this whole file into the Supabase dashboard's SQL Editor and run it once.
--
-- This extends SUPABASE.md's sketch, which only worked out RLS for `circles` and
-- `circle_members` and left the rest as "copy the pattern." Two things below are NOT
-- optional copy-paste of that doc:
--   1. Every table gets RLS enabled, including `profiles`. Supabase's PostgREST layer
--      exposes every `public` schema table over the API by default — a table with RLS
--      never turned on is readable/writable by anyone holding just the publishable key,
--      no login required. `profiles` holds PII (name), so it must not be skipped.
--   2. Helper function parameters are prefixed (`p_circle_id`, not `circle_id`) because
--      the original naming collided with column names of the same name used inside the
--      function body, which Postgres treats as an ambiguous reference.

-- ============================================================================
-- 1) TABLES
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  city        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table public.circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz default now()
);

create table public.circle_members (
  circle_id     uuid references public.circles (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  status        text default 'active',      -- active | paused
  captain_order int,                         -- rotation order; null = recently led
  joined_at     timestamptz default now(),
  primary key (circle_id, user_id)
);

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid references public.circles (id) on delete cascade,
  title       text,
  status      text default 'draft',        -- draft | voting | confirmed | past | cancelled
  captain_id  uuid references public.profiles (id),
  event_date  date,
  created_at  timestamptz default now()
);

create table public.ideas (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid references public.plans (id) on delete cascade,
  title       text not null,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz default now()
);

create table public.swipes (
  idea_id     uuid references public.ideas (id) on delete cascade,
  user_id     uuid references public.profiles (id),
  direction   text not null,               -- like | dislike | skip
  created_at  timestamptz default now(),
  primary key (idea_id, user_id)
);

create table public.votes (
  plan_id     uuid references public.plans (id) on delete cascade,
  user_id     uuid references public.profiles (id),
  idea_id     uuid references public.ideas (id),
  created_at  timestamptz default now(),
  primary key (plan_id, user_id)
);

-- ============================================================================
-- 2) HELPER FUNCTIONS
--    security definer: these run with the function owner's privileges, so a policy
--    can check circle_members / plans / ideas even when the caller's own RLS view
--    of those tables wouldn't otherwise let them read the row directly.
-- ============================================================================

create or replace function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id and user_id = p_user_id and status = 'active'
  );
$$;

create or replace function public.plan_circle_id(p_plan_id uuid)
returns uuid language sql stable security definer as $$
  select circle_id from public.plans where id = p_plan_id;
$$;

create or replace function public.idea_circle_id(p_idea_id uuid)
returns uuid language sql stable security definer as $$
  select public.plan_circle_id(plan_id) from public.ideas where id = p_idea_id;
$$;

-- ============================================================================
-- 3) ROW LEVEL SECURITY
-- ============================================================================

-- PROFILES: you can always read/update your own row; you can also read the profile
-- of anyone who shares a circle with you (needed to show member names/avatars).
alter table public.profiles enable row level security;

create policy "read own or circle-mates' profile"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.circle_members mine
      join public.circle_members theirs on theirs.circle_id = mine.circle_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
        and mine.status = 'active'
        and theirs.status = 'active'
    )
  );

create policy "update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- CIRCLES
alter table public.circles enable row level security;

-- `or created_by = auth.uid()` matters beyond just "creators can see their own circle": an
-- INSERT ... RETURNING (e.g. supabase-js's .insert().select()) must also satisfy this SELECT
-- policy for the row it returns, and at the moment a circle is inserted the creator's
-- circle_members row doesn't exist yet (it's created in the very next statement) — without
-- this clause, creating a circle fails with "new row violates row-level security policy".
create policy "members can read their circles"
  on public.circles for select to authenticated
  using (public.is_circle_member(id, auth.uid()) or created_by = auth.uid());

create policy "anyone authenticated can create a circle"
  on public.circles for insert to authenticated
  with check (auth.uid() = created_by);

-- CIRCLE_MEMBERS
alter table public.circle_members enable row level security;

create policy "members can read their circle's members"
  on public.circle_members for select to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

-- Self-service join is restricted to circles you created (i.e. right after creating one).
-- Joining a circle you didn't create is a future invite-link feature, not a free-for-all —
-- without this restriction, any authenticated user could add themselves to any circle_id
-- they can guess and gain read access to that circle's plans/ideas/votes via is_circle_member.
create policy "creators can add themselves as a member"
  on public.circle_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.circles c where c.id = circle_id and c.created_by = auth.uid())
  );

-- PLANS
alter table public.plans enable row level security;

create policy "members can read their circle's plans"
  on public.plans for select to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

create policy "members can create plans in their circle"
  on public.plans for insert to authenticated
  with check (public.is_circle_member(circle_id, auth.uid()));

create policy "members can update their circle's plans"
  on public.plans for update to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

-- IDEAS
alter table public.ideas enable row level security;

create policy "members can read ideas for their circle's plans"
  on public.ideas for select to authenticated
  using (public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members can add ideas to their circle's plans"
  on public.ideas for insert to authenticated
  with check (public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

-- SWIPES
alter table public.swipes enable row level security;

create policy "members can read swipes in their circle"
  on public.swipes for select to authenticated
  using (public.is_circle_member(public.idea_circle_id(idea_id), auth.uid()));

create policy "members record their own swipes"
  on public.swipes for insert to authenticated
  with check (user_id = auth.uid() and public.is_circle_member(public.idea_circle_id(idea_id), auth.uid()));

create policy "members update their own swipes"
  on public.swipes for update to authenticated
  using (user_id = auth.uid());

-- VOTES
alter table public.votes enable row level security;

create policy "members can read votes in their circle"
  on public.votes for select to authenticated
  using (public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members record their own vote"
  on public.votes for insert to authenticated
  with check (user_id = auth.uid() and public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members update their own vote"
  on public.votes for update to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 4) AUTO-CREATE A PROFILE ROW ON SIGNUP
-- ============================================================================

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
