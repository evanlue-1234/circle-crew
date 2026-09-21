-- Slice 5: the swipe deck needs more than a title to render a real card.
alter table public.ideas add column venue text;
alter table public.ideas add column start_time timestamptz;
alter table public.ideas add column url text;
alter table public.ideas add column image_url text;
