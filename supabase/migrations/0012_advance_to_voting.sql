-- Carves out one specific exception to the captain-only status trigger (migration 0011):
-- any active circle member may advance a plan straight to 'voting' — but only when this
-- function independently re-verifies, server-side, that every active circle member has
-- actually completed the plan (a plan_responses row + at least 3 'like' swipes on the plan's
-- ideas). A client can't use this to force the transition early — it isn't trusted on the
-- client's say-so, it's re-checked here. Every other status transition still requires the
-- caller to be the plan's captain, unchanged from 0011.
create or replace function public.enforce_captain_status_change()
returns trigger language plpgsql as $$
declare
  total_active_members int;
  completed_members int;
begin
  if new.status is distinct from old.status and auth.uid() is not null and old.captain_id is distinct from auth.uid() then
    if new.status <> 'voting' then
      raise exception 'only the plan captain can change its status';
    end if;

    select count(*) into total_active_members
    from public.circle_members
    where circle_id = old.circle_id and status = 'active';

    select count(*) into completed_members
    from public.circle_members cm
    where cm.circle_id = old.circle_id
      and cm.status = 'active'
      and exists (
        select 1 from public.plan_responses pr
        where pr.plan_id = old.id and pr.user_id = cm.user_id
      )
      and (
        select count(*) from public.swipes sw
        join public.ideas i on i.id = sw.idea_id
        where i.plan_id = old.id and sw.user_id = cm.user_id and sw.direction = 'like'
      ) >= 3;

    if total_active_members = 0 or completed_members < total_active_members then
      raise exception 'cannot advance to voting until all circle members have completed the plan';
    end if;
  end if;
  return new;
end;
$$;
