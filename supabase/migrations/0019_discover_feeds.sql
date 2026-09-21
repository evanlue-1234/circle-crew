-- Powers Discover's "Popular with Other Circles" and "Events Friends are Interested In"
-- feeds. Both are SECURITY DEFINER so they can read across circles the caller isn't a member
-- of (RLS on plans/swipes/ideas would otherwise block that entirely) while returning only
-- anonymized, aggregated columns — no circle_id, captain_id, or user identity ever leaves
-- these functions.
--
-- Neither function can dedupe by an idea id: ideas.plan_id ties every idea row to one
-- specific plan, and loadDeckForPlan() (src/lib/ideaDeck.ts) inserts a fresh ideas row into
-- each plan it backfills — so the "same" real-world Ticketmaster event or local activity gets
-- a different ideas.id in every circle's plan. Grouping by (source, title, venue-or-city)
-- instead is what actually identifies "the same event" across circles.

-- ============================================================================
-- discover_popular_events: confirmed plans' chosen events in circles the caller is NOT in.
-- ============================================================================
create or replace function public.discover_popular_events()
returns table (
  event_key    text,
  title        text,
  source       text,
  venue        text,
  city         text,
  start_time   timestamptz,
  price_note   text,
  vibe         text,
  image_url    text,
  url          text,
  group_count  bigint
)
language sql
stable
security definer
as $$
  select
    (p.chosen_idea ->> 'source') || ':' || (p.chosen_idea ->> 'title') || ':' ||
      coalesce(p.chosen_idea ->> 'venue', p.chosen_idea ->> 'city', '') as event_key,
    p.chosen_idea ->> 'title' as title,
    p.chosen_idea ->> 'source' as source,
    p.chosen_idea ->> 'venue' as venue,
    p.chosen_idea ->> 'city' as city,
    nullif(p.chosen_idea ->> 'start_time', '')::timestamptz as start_time,
    p.chosen_idea ->> 'price_note' as price_note,
    p.chosen_idea ->> 'vibe' as vibe,
    p.chosen_idea ->> 'image_url' as image_url,
    p.chosen_idea ->> 'url' as url,
    count(distinct p.circle_id) as group_count
  from public.plans p
  where p.status = 'confirmed'
    and p.chosen_idea is not null
    and not public.is_circle_member(p.circle_id, auth.uid())
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  order by group_count desc;
$$;

grant execute on function public.discover_popular_events() to authenticated;

-- ============================================================================
-- discover_friend_liked_events: like-swipes from members of the caller's own circles.
-- ============================================================================
create or replace function public.discover_friend_liked_events()
returns table (
  event_key     text,
  title         text,
  source        text,
  venue         text,
  city          text,
  start_time    timestamptz,
  price_note    text,
  vibe          text,
  image_url     text,
  url           text,
  friend_count  bigint
)
language sql
stable
security definer
as $$
  select
    i.source || ':' || i.title || ':' || coalesce(i.venue, la.city, '') as event_key,
    i.title,
    i.source,
    i.venue,
    la.city,
    i.start_time,
    la.price_note,
    la.vibe,
    i.image_url,
    i.url,
    count(distinct sw.user_id) as friend_count
  from public.swipes sw
  join public.ideas i on i.id = sw.idea_id
  left join public.local_activities la on la.id = i.local_activity_id
  join public.circle_members mine on mine.user_id = auth.uid() and mine.status = 'active'
  join public.circle_members theirs
    on theirs.circle_id = mine.circle_id
    and theirs.user_id = sw.user_id
    and theirs.status = 'active'
  where sw.direction = 'like'
    and sw.user_id <> auth.uid()
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  order by friend_count desc;
$$;

grant execute on function public.discover_friend_liked_events() to authenticated;

notify pgrst, 'reload schema';
