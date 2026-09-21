import { supabase } from "./supabase";

// Both feeds return the same shape: an anonymized, deduped event plus a count. See
// migration 0019 for why dedup can't use an idea id (every plan gets its own fresh copies of
// the same real-world event/activity).
export type DiscoverAggregateRow = {
  event_key: string;
  title: string;
  source: "ticketmaster" | "local";
  venue: string | null;
  city: string | null;
  start_time: string | null;
  price_note: string | null;
  vibe: string | null;
  image_url: string | null;
  url: string | null;
  count: number;
};

export async function fetchPopularWithOtherCircles(): Promise<DiscoverAggregateRow[]> {
  const { data, error } = await supabase.rpc("discover_popular_events");
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({ ...row, count: Number(row.group_count) }));
}

export async function fetchFriendLikedEvents(): Promise<DiscoverAggregateRow[]> {
  const { data, error } = await supabase.rpc("discover_friend_liked_events");
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({ ...row, count: Number(row.friend_count) }));
}
