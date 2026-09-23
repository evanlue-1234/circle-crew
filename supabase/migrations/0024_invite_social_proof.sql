-- Slice C: JoinScreen social proof (inviter name + a preview of existing members) and the
-- data needed to tell a brand-new invited user (needs quick signup) from a returning one
-- (skips straight to the join prompt).
--
-- invited_by mirrors the column the old, now-retired `invites` table had (migration 0002) —
-- that data was genuinely lost when circle_members replaced it (migration 0020) and nothing
-- else populates it, so it needs adding back rather than being derivable from anything else.
alter table public.circle_members add column invited_by uuid references public.profiles(id);

-- One new SECURITY DEFINER function rather than widening circle_members'/profiles' own RLS
-- policies to let an invited-but-not-yet-joined caller read other members' names: those two
-- tables' policies are load-bearing everywhere else in the app, and a function scoped to
-- exactly this read is a smaller, safer surface than teaching either policy a new case. Same
-- shape as discover_popular_events/discover_friend_liked_events — a scoped read across an RLS
-- boundary via a function, not a new HTTP endpoint.
create or replace function public.get_circle_invite_preview(p_circle_id uuid)
returns table (
  circle_name   text,
  inviter_name  text,
  member_names  text[]
)
language sql
stable
security definer
as $$
  select
    c.name,
    inviter.name,
    (
      select coalesce(array_agg(m.name), '{}')
      from (
        select p.name
        from public.circle_members cm2
        join public.profiles p on p.id = cm2.user_id
        where cm2.circle_id = c.id and cm2.status = 'active'
        order by cm2.joined_at
        limit 5
      ) m
    )
  from public.circles c
  left join public.circle_members invite_row
    on invite_row.circle_id = c.id and lower(invite_row.email) = lower(public.my_email())
  left join public.profiles inviter on inviter.id = invite_row.invited_by
  where c.id = p_circle_id
    and (public.is_circle_member(c.id, auth.uid()) or invite_row.id is not null);
$$;

grant execute on function public.get_circle_invite_preview(uuid) to authenticated;

notify pgrst, 'reload schema';
