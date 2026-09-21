-- Lets the swipe deck merge curated local_activities in alongside Ticketmaster events.
-- `source` distinguishes the two; `local_activity_id` links a local-sourced idea back to its
-- full local_activities row (city/price/vibe/energy/exclude_tags) via an embedded select, so
-- those fields stay live rather than being duplicated onto `ideas` at insert time.
alter table public.ideas add column source text not null default 'ticketmaster';
alter table public.ideas add column local_activity_id uuid references public.local_activities(id);

notify pgrst, 'reload schema';
