-- Same shape as advance_plan_to_voting / advance_plan_to_rsvp: the only writer of
-- plans.status for the rsvp -> confirmed transition. status is already function-only for
-- `authenticated` (migration 0013's REVOKE covers it), so no new REVOKE is needed here.
--
-- "All active members" (not majority) to match slice 4's advance_plan_to_rsvp threshold —
-- chosen_idea/chosen_day/chosen_time were already set by advance_plan_to_rsvp, so this
-- function only ever writes status.
create or replace function public.advance_plan_to_confirmed(p_plan_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_circle_id uuid;
  v_status text;
  v_total_active int;
  v_rsvpd int;
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

  if v_status <> 'rsvp' then
    if v_status = 'confirmed' then
      return 'already_confirmed';
    end if;
    return 'not_rsvp';
  end if;

  select count(*) into v_total_active
  from public.circle_members
  where circle_id = v_circle_id and status = 'active';

  select count(distinct r.user_id) into v_rsvpd
  from public.plan_rsvps r
  join public.circle_members cm on cm.user_id = r.user_id and cm.circle_id = v_circle_id and cm.status = 'active'
  where r.plan_id = p_plan_id;

  if v_total_active = 0 or v_rsvpd < v_total_active then
    return 'not_all_rsvpd';
  end if;

  update public.plans
  set status = 'confirmed'
  where id = p_plan_id and status = 'rsvp';

  return 'confirmed';
end;
$$;

grant execute on function public.advance_plan_to_confirmed(uuid) to authenticated;

notify pgrst, 'reload schema';
