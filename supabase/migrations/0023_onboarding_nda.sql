-- Slice A of onboarding: NDA gate for the testing phase.
--
-- Renumbered from the spec's suggested "0022" — that number was already used by
-- 0022_circle_members_user_id_nullable.sql (the invite feature's user_id-not-null fix).
--
-- No RLS changes: profiles' existing "update own profile" policy (using (id = auth.uid()))
-- is row-level with no column restriction, so it already lets a user write
-- nda_accepted_at on their own row. Same for "read own or circle-mates' profile" reading
-- their own row. Adding a redundant policy here would just be dead weight.
--
-- One caveat worth being explicit about rather than silently deciding either way: "don't
-- expose other users' nda_accepted_at" isn't actually enforced by this. RLS is row-level, not
-- column-level — once a circle-mate's row is visible at all (the existing policy's second
-- clause), every column on it is selectable, which already includes name/city/phone/email
-- today. Truly hiding just this one column from people who can otherwise read the row would
-- need the column-level REVOKE + SECURITY DEFINER accessor pattern this schema already uses
-- for plans.status (see migration 0013) — real, working machinery, but a bigger and
-- inconsistent lift to add for a single low-sensitivity testing-phase flag. Flagging this so
-- it's a known, deliberate gap rather than an assumed guarantee.
alter table public.profiles add column nda_accepted_at timestamptz;

notify pgrst, 'reload schema';
