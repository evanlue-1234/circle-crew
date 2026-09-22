-- Fixes: null value in column "user_id" of relation "circle_members" violates not-null
-- constraint.
--
-- Migration 0020 dropped circle_members' old primary key (circle_id, user_id) so an
-- 'invited' row could have a null user_id. But dropping a PRIMARY KEY constraint in Postgres
-- does NOT clear the NOT NULL it implicitly set on that column — that has to be dropped
-- separately, which 0020 missed. Every invite insert (user_id: null) was failing at the
-- database level because of this leftover constraint.
alter table public.circle_members alter column user_id drop not null;

notify pgrst, 'reload schema';
