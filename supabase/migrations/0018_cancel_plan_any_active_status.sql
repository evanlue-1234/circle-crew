-- Lets the captain scrap a plan mid-vote/RSVP, not just while still a draft — the Plans tab's
-- Pending section now shows a Remove button for the captain's own voting/rsvp plans, same
-- action as Drafts. 'confirmed' is deliberately excluded: once a plan is confirmed, members
-- may already be relying on it (calendar adds, RSVPs) — cancelling would need a different,
-- more visible flow than a quiet status flip, so that's left for later.
create or replace function public.cancel_plan(p_plan_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_captain_id uuid;
  v_status text;
begin
  select captain_id, status into v_captain_id, v_status
  from public.plans where id = p_plan_id
  for update;

  if v_captain_id is null then
    return 'not_found';
  end if;

  if v_captain_id <> auth.uid() then
    raise exception 'only the plan captain can cancel this plan';
  end if;

  if v_status = 'cancelled' then
    return 'already_cancelled';
  end if;

  if v_status not in ('collecting', 'voting', 'rsvp') then
    return 'not_cancellable';
  end if;

  update public.plans
  set status = 'cancelled'
  where id = p_plan_id and status in ('collecting', 'voting', 'rsvp');

  return 'cancelled';
end;
$$;

grant execute on function public.cancel_plan(uuid) to authenticated;

notify pgrst, 'reload schema';
