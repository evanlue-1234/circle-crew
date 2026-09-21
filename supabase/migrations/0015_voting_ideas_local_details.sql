-- CommitScreen/ConfirmedScreen need to show a local idea's city/price/vibe/group size, and
-- Maps needs a real city for the query — but voting_ideas (and chosen_idea, copied from one
-- of its elements) only ever carried id/title/source/venue/start_time/url/image_url/votes.
-- Left-joining local_activities here (same table swipe deck reads via ideas.local_activity_id
-- in ideaDeck.ts) fills that in for source='local' rows without duplicating the data anywhere.
create or replace function public.advance_plan_to_voting(p_plan_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_circle_id uuid;
  v_status text;
  v_voting_ideas jsonb;
  v_total_active int;
  v_completed int;
  v_best_day text;
  v_best_time text;
begin
  select circle_id, status, voting_ideas into v_circle_id, v_status, v_voting_ideas
  from public.plans where id = p_plan_id
  for update;

  if v_circle_id is null then
    return 'not_found';
  end if;

  if not public.is_circle_member(v_circle_id, auth.uid()) then
    raise exception 'not a member of this plan''s circle';
  end if;

  if v_status = 'voting' and v_voting_ideas is not null then
    return 'already_voting';
  end if;

  if v_status not in ('collecting', 'voting') then
    return 'not_collecting';
  end if;

  select count(*) into v_total_active
  from public.circle_members
  where circle_id = v_circle_id and status = 'active';

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
        select jsonb_agg(row_to_json(t))
        from (
          select i.id, i.title, i.source, i.venue, i.start_time, i.url, i.image_url,
                 la.city, la.price_note, la.price_min, la.vibe, la.group_size_note,
                 count(sw.idea_id) as votes
          from public.ideas i
          left join public.local_activities la on la.id = i.local_activity_id
          left join public.swipes sw
            on sw.idea_id = i.id
            and sw.direction = 'like'
            and sw.user_id in (
              select user_id from public.circle_members where circle_id = v_circle_id and status = 'active'
            )
          where i.plan_id = p_plan_id
          group by i.id, i.title, i.source, i.venue, i.start_time, i.url, i.image_url,
                   la.city, la.price_note, la.price_min, la.vibe, la.group_size_note
          order by count(sw.idea_id) desc, i.created_at asc
          limit 2
        ) t
      ),
      best_day = v_best_day,
      best_time = v_best_time
  where id = p_plan_id and status in ('collecting', 'voting');

  return 'voting';
end;
$$;

grant execute on function public.advance_plan_to_voting(uuid) to authenticated;

notify pgrst, 'reload schema';
