-- Curated standing local venues/activities (mini-golf, escape rooms, etc.) that supplement
-- the dated Ticketmaster events in the swipe deck. Seeded from crew-activities.json via
-- scripts/seed-activities.mjs, which runs with the service role key.
create table public.local_activities (
  id                uuid primary key default gen_random_uuid(),
  category          text,
  name              text not null,
  city              text,
  kid_friendly      boolean,
  kid_friendly_note text,
  group_min         int,
  group_max         int,
  group_size_note   text,
  price_min         int,
  price_max         int,
  price_note        text,
  food              text,
  has_alcohol       boolean,
  alcohol           text,
  mocktails         text,
  vibe              text,
  vibe_scale        int,
  energy_scale      int,
  exclude_tags      text[],
  source            text default 'manual',
  created_at        timestamptz default now(),

  -- Not in the original spec, but required for the seed script's upsert (`match on
  -- name+city`) to work at all — Postgres's ON CONFLICT needs a real unique constraint to
  -- target, otherwise re-running the seed script would insert duplicates instead of updating.
  unique (name, city)
);

alter table public.local_activities enable row level security;

-- Curated content, safe to expose to any signed-in user; writes are seed-script-only (via
-- the service role key, which bypasses RLS entirely), so no insert/update/delete policy is
-- defined here on purpose.
create policy "authenticated users can read local activities"
  on public.local_activities for select to authenticated
  using (true);

notify pgrst, 'reload schema';
