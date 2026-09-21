-- Fixes: "Could not find the table 'public.invites' in the schema cache" when the table
-- exists but PostgREST's cached API schema hasn't picked it up yet after DDL run through
-- the SQL Editor. Forces PostgREST to reload.

NOTIFY pgrst, 'reload schema';
