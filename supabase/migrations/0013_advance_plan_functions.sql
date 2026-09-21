-- Retrofits slice 3's status advance to match slice 4's pattern: both plan-status
-- transitions now go through a single SECURITY DEFINER function each, which re-verifies
-- eligibility and writes atomically in one server round-trip — replacing the client-side
-- computation + trigger-carve-out approach from migrations 0011/0012.
--
-- Flow-control columns are now function-only writes: RLS/a trigger can't cleanly express
-- "any member may update these columns, but only through a vetted procedure" the way a
-- plain column-level REVOKE can. A SECURITY DEFINER function runs as its owner (the
-- migration-running role, which owns `plans`), so it keeps write access to these columns
-- even after `authenticated` loses it — the same mechanism that already lets
-- is_circle_member() etc. read rows a caller's own RLS view wouldn't otherwise allow.
drop trigger if exists plans_status_change_captain_only on public.plans;
drop function if exists public.enforce_captain_status_change();

revoke update (status, voting_ideas, best_day, best_time, chosen_idea, chosen_day, chosen_time)
  on public.plans from authenticated;

-- ============================================================================
-- advance_plan_to_voting: collecting -> voting
-- ============================================================================
create or replace function public.advance_plan_to_voting(p_plan_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_circle_id uuid;
  v_status text;
  v_total_active int;
  v_completed int;
  v_best_day text;
  v_best_time text;
begin
  select circle_id, status into v_circle_id, v_status
  from public.plans where id = p_plan_id
  for update;

  if v_circle_id is null then
    return 'not_found';
  end if;

  if not public.is_circle_member(v_circle_id, auth.uid()) then
    raise exception 'not a member of this plan''s circle';
  end if;

  if v_status <> 'collecting' then
    if v_status = 'voting' then
      return 'already_voting';
    end if;
    return 'not_collecting';
  end if;

  select count(*) into v_total_active
  from public.circle_members
  where circle_id = v_circle_id and status = 'active';

  -- "Completed" = a plan_responses row + at least 3 like-swipes on this plan's ideas — the
  -- same definition the client already uses (hasUserCompletedPlan), re-verified here rather
  -- than trusted from the caller.
  select count(*) into v_completed
  from public.circle_members cm
  where cm.circle_id = v_circle_id
    and cm.status = 'active'
    and exists (
      select 1 from public.plan_responses pr
      where pr.plan_id = p_plan_id and pr.user_id = cm.user_id
    )
    and (
      select count(*) from public.swipes sw
      join public.ideas i on i.id = sw.idea_id
      where i.plan_id = p_plan_id and sw.user_id = cm.user_id and sw.direction = 'like'
    ) >= 3;

  if v_total_active = 0 or v_completed < v_total_active then
    return 'not_all_completed';
  end if;

  -- Best day/time: a value every completed member's response includes sorts first
  -- (intersection preferred); otherwise the most-picked single value wins (popularity
  -- fallback) — both expressed in one ORDER BY rather than two branches.
  select day_counts.day into v_best_day
  from (
    select d.value as day, count(*) as cnt
    from public.plan_responses pr
    join public.circle_members cm on cm.user_id = pr.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
    cross join lateral unnest(coalesce(pr.days, '{}')) as d(value)
    where pr.plan_id = p_plan_id
    group by d.value
  ) day_counts
  cross join (
    select count(*) as n
    from public.plan_responses pr
    join public.circle_members cm on cm.user_id = pr.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
    where pr.plan_id = p_plan_id
  ) totals
  order by (day_counts.cnt = totals.n) desc, day_counts.cnt desc
  limit 1;

  select time_counts.time_value into v_best_time
  from (
    select t.value as time_value, count(*) as cnt
    from public.plan_responses pr
    join public.circle_members cm on cm.user_id = pr.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
    cross join lateral unnest(coalesce(pr.times, '{}')) as t(value)
    where pr.plan_id = p_plan_id
    group by t.value
  ) time_counts
  cross join (
    select count(*) as n
    from public.plan_responses pr
    join public.circle_members cm on cm.user_id = pr.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
    where pr.plan_id = p_plan_id
  ) totals
  order by (time_counts.cnt = totals.n) desc, time_counts.cnt desc
  limit 1;

  update public.plans
  set status = 'voting',
      voting_ideas = (
        -- Top 2 ideas by like-swipe count across all active members.
        select jsonb_agg(row_to_json(t))
        from (
          select i.id, i.title, i.source, i.venue, i.start_time, i.url, i.image_url,
                 count(sw.idea_id) as votes
          from public.ideas i
          left join public.swipes sw
            on sw.idea_id = i.id
            and sw.direction = 'like'
            and sw.user_id in (
              select user_id from public.circle_members where circle_id = v_circle_id and status = 'active'
            )
          where i.plan_id = p_plan_id
          group by i.id, i.title, i.source, i.venue, i.start_time, i.url, i.image_url
          order by count(sw.idea_id) desc, i.created_at asc
          limit 2
        ) t
      ),
      best_day = v_best_day,
      best_time = v_best_time
  where id = p_plan_id and status = 'collecting';

  return 'voting';
end;
$$;

grant execute on function public.advance_plan_to_voting(uuid) to authenticated;

-- ============================================================================
-- advance_plan_to_rsvp: voting -> rsvp
-- ============================================================================
create or replace function public.advance_plan_to_rsvp(p_plan_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_circle_id uuid;
  v_status text;
  v_voting_ideas jsonb;
  v_best_day text;
  v_best_time text;
  v_total_active int;
  v_voted int;
  v_winner jsonb;
begin
  select circle_id, status, voting_ideas, best_day, best_time
  into v_circle_id, v_status, v_voting_ideas, v_best_day, v_best_time
  from public.plans where id = p_plan_id
  for update;

  if v_circle_id is null then
    return 'not_found';
  end if;

  if not public.is_circle_member(v_circle_id, auth.uid()) then
    raise exception 'not a member of this plan''s circle';
  end if;

  if v_status <> 'voting' then
    if v_status = 'rsvp' then
      return 'already_rsvp';
    end if;
    return 'not_voting';
  end if;

  select count(*) into v_total_active
  from public.circle_members
  where circle_id = v_circle_id and status = 'active';

  select count(distinct v.user_id) into v_voted
  from public.votes v
  join public.circle_members cm on cm.user_id = v.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
  where v.plan_id = p_plan_id;

  -- MVP threshold: every active member must vote (not a simple majority) before the plan
  -- advances — per the task's own note, easy to relax to majority later if needed.
  if v_total_active = 0 or v_voted < v_total_active then
    return 'not_all_voted';
  end if;

  -- Winner = most final votes; ties broken by the like-swipe count already stored per idea
  -- in voting_ideas from advance_plan_to_voting (no need to recompute it here).
  select vi into v_winner
  from jsonb_array_elements(coalesce(v_voting_ideas, '[]'::jsonb)) as vi
  left join lateral (
    select count(*) as final_votes
    from public.votes v
    where v.plan_id = p_plan_id and v.idea_id::text = (vi ->> 'id')
  ) fv on true
  order by fv.final_votes desc, coalesce((vi ->> 'votes')::int, 0) desc
  limit 1;

  if v_winner is null then
    return 'no_candidates';
  end if;

  update public.plans
  set status = 'rsvp',
      chosen_idea = v_winner,
      chosen_day = v_best_day,
      chosen_time = v_best_time
  where id = p_plan_id and status = 'voting';

  return 'rsvp';
end;
$$;

grant execute on function public.advance_plan_to_rsvp(uuid) to authenticated;
