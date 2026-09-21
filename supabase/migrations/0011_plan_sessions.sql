-- Turns a "plan" into a real multi-user session: renames/extends its status lifecycle and
-- adds per-user response/RSVP tables. captain_id already existed on plans (schema.sql).
--
-- plan_selections was considered but dropped: a user's chosen ideas are already fully
-- captured by swipes (direction='like') joined to ideas (title/venue/image/source) — a
-- separate table would just be a second, driftable copy of the same data.

-- 'draft' -> 'collecting' is a rename, not a new value — update existing rows to match.
-- 'past' is dropped: nothing ever read it (CircleHub already derives past/upcoming from
-- plans.event_date, not status).
update public.plans set status = 'collecting' where status = 'draft';
alter table public.plans alter column status set default 'collecting';

alter table public.plans add column voting_ideas jsonb;
alter table public.plans add column best_day text;
alter table public.plans add column best_time text;
alter table public.plans add column chosen_idea jsonb;
alter table public.plans add column chosen_day text;
alter table public.plans add column chosen_time text;

-- Per-user poll answers for a specific plan (previously only lived client-side in a Zustand
-- store, with no durable link to a plan or user).
create table public.plan_responses (
  plan_id     uuid references public.plans (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  days        text[],
  times       text[],
  drive       text,
  budget      text,
  vibe        int,
  energy      int,
  not_in_mood text[],
  created_at  timestamptz default now(),
  primary key (plan_id, user_id)
);

create table public.plan_rsvps (
  plan_id     uuid references public.plans (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  response    text not null,
  created_at  timestamptz default now(),
  primary key (plan_id, user_id)
);

alter table public.plan_responses enable row level security;
alter table public.plan_rsvps enable row level security;

create policy "members can read their circle's plan responses"
  on public.plan_responses for select to authenticated
  using (public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members can insert their own plan response"
  on public.plan_responses for insert to authenticated
  with check (user_id = auth.uid() and public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members can update their own plan response"
  on public.plan_responses for update to authenticated
  using (user_id = auth.uid());

create policy "members can read their circle's plan rsvps"
  on public.plan_rsvps for select to authenticated
  using (public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members can insert their own rsvp"
  on public.plan_rsvps for insert to authenticated
  with check (user_id = auth.uid() and public.is_circle_member(public.plan_circle_id(plan_id), auth.uid()));

create policy "members can update their own rsvp"
  on public.plan_rsvps for update to authenticated
  using (user_id = auth.uid());

-- "Only the captain (or service role) can advance plan.status": RLS is row-level, not
-- column-level, so a normal UPDATE policy can't say "any member may edit these columns but
-- only the captain may change this one." A trigger can, and applies regardless of which
-- policy let the UPDATE through. auth.uid() is null for service-role/direct-SQL access
-- (no JWT claims), so those are left alone — only a mismatched *authenticated* caller is
-- blocked.
create or replace function public.enforce_captain_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and auth.uid() is not null
     and old.captain_id is distinct from auth.uid() then
    raise exception 'only the plan captain can change its status';
  end if;
  return new;
end;
$$;

create trigger plans_status_change_captain_only
  before update on public.plans
  for each row execute function public.enforce_captain_status_change();

notify pgrst, 'reload schema';
