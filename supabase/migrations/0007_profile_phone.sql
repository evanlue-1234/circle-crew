-- Settings screen: phone number is now editable and persisted on the profile.
alter table public.profiles add column phone text;

-- Without this, PostgREST can keep serving its cached pre-migration schema and requests
-- referencing the new column fail with "Could not find the 'phone' column" — same class of
-- bug fixed for `invites` in migration 0005.
notify pgrst, 'reload schema';
