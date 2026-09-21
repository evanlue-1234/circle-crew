-- Same shape as the advance_plan_to_* functions: the only writer of plans.status for this
-- transition (status is already function-only for `authenticated` via migration 0013's
-- REVOKE, which covers every value including 'cancelled', so no new REVOKE is needed).
-- Captain-only, and only from 'collecting' — a plan already past that point should be
-- resolved through the normal voting/rsvp flow, not yanked out from under members who may
-- have already responded.
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
    raise exception 'only the plan captain can remove this draft';
  end if;

  if v_status <> 'collecting' then
    if v_status = 'cancelled' then
      return 'already_cancelled';
    end if;
    return 'not_collecting';
  end if;

  update public.plans
  set status = 'cancelled'
  where id = p_plan_id and status = 'collecting';

  return 'cancelled';
end;
$$;

grant execute on function public.cancel_plan(uuid) to authenticated;

notify pgrst, 'reload schema';
