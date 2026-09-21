import { SELECT_TARGET } from "./ideaDeck";
import { supabase } from "./supabase";

/** A member is "done" with a plan once they've answered its poll and picked their 3 ideas —
 * both computed from existing tables (plan_responses, swipes+ideas), not a separate
 * plan_selections table, so there's one source of truth for "has this user finished." Used
 * by both Circle Hub's button state and PendingScreen's per-member progress. */
export async function hasUserCompletedPlan(planId: string, userId: string): Promise<boolean> {
  const { data: responseRow } = await supabase
    .from("plan_responses")
    .select("plan_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!responseRow) return false;

  const { data: ideaRows } = await supabase.from("ideas").select("id").eq("plan_id", planId);
  const ideaIds = (ideaRows ?? []).map((row) => row.id);
  if (ideaIds.length === 0) return false;

  const { count } = await supabase
    .from("swipes")
    .select("idea_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "like")
    .in("idea_id", ideaIds);

  return (count ?? 0) >= SELECT_TARGET;
}

/** Used by resolvePlanStep to tell "cast your vote" from "waiting on others" once a plan has
 * reached the voting stage. votes' primary key is (plan_id, user_id), so a row's presence is
 * enough — no need to inspect which idea it's for. */
export async function hasUserVoted(planId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("votes")
    .select("plan_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Same idea as hasUserVoted, for the rsvp stage — plan_rsvps' primary key is also
 * (plan_id, user_id). */
export async function hasUserRsvpd(planId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("plan_rsvps")
    .select("plan_id")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
