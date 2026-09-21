-- Fixes: "insert or update on table circles violates foreign key constraint
-- circles_created_by_fkey". Any auth.users row created before the handle_new_user() trigger
-- (Slice 3) was installed has no matching profiles row. Safe to run more than once — only
-- inserts the ones that are missing.

insert into public.profiles (id, name, city)
select id, raw_user_meta_data->>'name', null
from auth.users
where id not in (select id from public.profiles);
