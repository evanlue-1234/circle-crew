-- Real invite-by-email + join flow. Two deliberate departures from the literal spec this
-- migration was written against — both load-bearing, both explained inline below:
--
-- 1. circle_members.status already exists (schema.sql), with an established vocabulary of
--    'active' | 'paused' that is_circle_member() and a very large fraction of this app's RLS
--    policies and queries key off of (plans/ideas/swipes/votes/plan_responses/plan_rsvps
--    RLS, CircleHub, HomeScreen, PlansScreen, PendingScreen, CommitScreen, the discover_*
--    functions, cancel_plan, advance_plan_to_*...). The spec asked for a *new* column
--    `status text default 'member'` with values 'invited'|'member' — that would collide with
--    the existing column name and, if it somehow won by replacement instead, would silently
--    break every one of those `status = 'active'` checks across the app. Instead, 'invited'
--    is added as a third value alongside the existing two, and acceptance transitions a row
--    to 'active' (not 'member') so it satisfies is_circle_member() exactly like every other
--    real member row already does.
--
-- 2. user_id was part of circle_members' primary key (circle_id, user_id) — a PK column can
--    never be NULL in Postgres, so an 'invited' row with no user yet literally could not have
--    existed under the old schema. This replaces the PK with a surrogate `id`, and adds
--    `unique (circle_id, user_id)` (member rows still unique per circle; multiple NULLs are
--    fine — that's every invited row before it's claimed) plus `unique (circle_id, email)`
--    (the upsert target the invite Edge Function needs for its "don't duplicate, don't
--    re-email" idempotency requirement).

alter table public.profiles add column email text;

-- Backfill for every profile that predates this column — accept_circle_invite and the new
-- circle_members RLS clause both match on profiles.email, so an existing user with a null
-- email here would never be able to see or accept an invite sent to their real address.
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, city, email)
  values (new.id, new.raw_user_meta_data->>'name', null, lower(new.email));
  return new;
end;
$$;

alter table public.circle_members add column email text;

alter table public.circle_members drop constraint circle_members_pkey;
alter table public.circle_members add column id uuid primary key default gen_random_uuid();
alter table public.circle_members add constraint circle_members_circle_user_key unique (circle_id, user_id);
alter table public.circle_members add constraint circle_members_circle_email_key unique (circle_id, email);

-- circles: an invited-but-not-yet-joined user has no circle_members row that
-- is_circle_member() (status='active' only) would recognize, but JoinScreen still needs to
-- read the circle's name to show "You've been invited to join <name>". Widened to also allow
-- reading when ANY circle_members row (any status) references the caller, by user_id or by
-- their invited email.
drop policy "members can read their circles" on public.circles;

create policy "members can read their circles"
  on public.circles for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circles.id
        and (
          cm.user_id = auth.uid()
          or lower(cm.email) = lower((select email from public.profiles where id = auth.uid()))
        )
    )
  );

-- circle_members: same widening, applied directly (this is also how HomeScreen's "Pending
-- Invites" section finds a user's own invited rows). No new INSERT/UPDATE policy is added —
-- there was never an UPDATE policy on this table at all, so clients already can't change
-- status directly; accept_circle_invite (SECURITY DEFINER) is the only path from 'invited' to
-- 'active', and the invite Edge Function's service-role key bypasses RLS entirely for the
-- inserts it makes.
drop policy "members can read their circle's members" on public.circle_members;

create policy "members can read their circle's members or their own invites"
  on public.circle_members for select to authenticated
  using (
    public.is_circle_member(circle_id, auth.uid())
    or lower(email) = lower((select email from public.profiles where id = auth.uid()))
  );

-- Only path for an 'invited' row to become a real ('active') member — keeps circles private:
-- only someone whose email was actually invited can join.
create or replace function public.accept_circle_invite(p_circle_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_email text;
  v_status text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    return 'not_invited';
  end if;

  select status into v_status
  from public.circle_members
  where circle_id = p_circle_id and lower(email) = lower(v_email)
  for update;

  if v_status is null then
    return 'not_invited';
  end if;

  if v_status = 'active' then
    return 'already_member';
  end if;

  update public.circle_members
  set status = 'active', user_id = auth.uid()
  where circle_id = p_circle_id and lower(email) = lower(v_email);

  return 'joined';
end;
$$;

grant execute on function public.accept_circle_invite(uuid) to authenticated;

-- Superseded by circle_members.status='invited' rows — keeping both would mean two places
-- record "who's been invited," which drift the moment one gets updated and not the other.
drop table if exists public.invites;

notify pgrst, 'reload schema';
