-- Slice 4 addition. Run this in the SQL Editor AFTER supabase/schema.sql.
-- Going forward, new schema changes land as their own numbered file here rather than
-- editing schema.sql in place, so it's always clear what's already been run.

-- The Setup screen's "Description (optional)" field had nowhere to persist to.
alter table public.circles add column description text;

-- Pending invites captured on the Invite screen (email-only for MVP — real invite-by-link
-- resolution/acceptance is a future feature, per TASK_SUPABASE_EVENTBRITE.md Slice 4).
create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid references public.circles (id) on delete cascade,
  email       text not null,
  invited_by  uuid references public.profiles (id),
  created_at  timestamptz default now()
);

alter table public.invites enable row level security;

create policy "members can read their circle's invites"
  on public.invites for select to authenticated
  using (public.is_circle_member(circle_id, auth.uid()));

create policy "members can create invites for their circle"
  on public.invites for insert to authenticated
  with check (public.is_circle_member(circle_id, auth.uid()) and invited_by = auth.uid());
