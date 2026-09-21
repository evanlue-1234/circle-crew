-- Fixes: "new row violates row-level security policy for table circles" when creating a
-- circle. INSERT ... RETURNING (used by supabase-js's .insert().select()) must also satisfy
-- the table's SELECT policy for the returned row. The original policy only allowed rows where
-- you're already a circle_members row — but at the moment a circle is inserted, that
-- membership row doesn't exist yet (it's created in the very next statement). The creator
-- must be able to see their own circle regardless of circle_members state.

alter policy "members can read their circles"
  on public.circles
  using (public.is_circle_member(id, auth.uid()) or created_by = auth.uid());
