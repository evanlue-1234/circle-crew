-- Circles dashboard: "Leave Circle" action needs to delete the caller's own
-- circle_members row. No delete policy existed on this table yet (only select/insert), so
-- the delete would silently affect zero rows under RLS without this.
create policy "members can remove themselves from a circle"
  on public.circle_members for delete to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
