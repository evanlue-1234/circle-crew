-- Fixes: "infinite recursion detected in policy for relation circle_members".
--
-- Migration 0020's circles/circle_members SELECT policies each did a raw
-- `(select email from public.profiles where id = auth.uid())` subquery. That subquery runs
-- as the calling user, so it's subject to profiles' own (pre-existing) SELECT policy — which
-- itself does a raw subquery against circle_members to let circle-mates read each other's
-- profiles. That closes a loop: circle_members policy -> profiles -> circle_members -> ...
--
-- The fix is the same pattern is_circle_member()/plan_circle_id() already use: wrap the
-- lookup in a SECURITY DEFINER function, which bypasses RLS for the query inside it instead
-- of re-triggering another table's policy.
create or replace function public.my_email()
returns text
language sql
stable
security definer
as $$
  select email from public.profiles where id = auth.uid();
$$;

drop policy "members can read their circles" on public.circles;

create policy "members can read their circles"
  on public.circles for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circles.id
        and (cm.user_id = auth.uid() or lower(cm.email) = lower(public.my_email()))
    )
  );

drop policy "members can read their circle's members or their own invites" on public.circle_members;

create policy "members can read their circle's members or their own invites"
  on public.circle_members for select to authenticated
  using (
    public.is_circle_member(circle_id, auth.uid())
    or lower(email) = lower(public.my_email())
  );

notify pgrst, 'reload schema';
