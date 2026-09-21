import { supabase } from "./supabase";

// Both transitions are now atomic, server-side SECURITY DEFINER Postgres functions
// (migration 0013) — these are thin wrappers so call sites don't need to know the RPC name
// or unwrap the { data, error } shape themselves. The functions re-verify eligibility
// themselves rather than trusting the caller, so it's safe for any member's client to call
// these — including a non-captain finishing last — and safe to call redundantly from
// multiple clients around the same time.

export type AdvanceResult =
  | "voting"
  | "already_voting"
  | "not_collecting"
  | "not_all_completed"
  | "rsvp"
  | "already_rsvp"
  | "not_voting"
  | "not_all_voted"
  | "no_candidates"
  | "confirmed"
  | "already_confirmed"
  | "not_rsvp"
  | "not_all_rsvpd"
  | "not_found";

export async function advancePlanToVoting(planId: string): Promise<AdvanceResult> {
  const { data, error } = await supabase.rpc("advance_plan_to_voting", { p_plan_id: planId });
  if (error) throw new Error(error.message);
  return data as AdvanceResult;
}

export async function advancePlanToRsvp(planId: string): Promise<AdvanceResult> {
  const { data, error } = await supabase.rpc("advance_plan_to_rsvp", { p_plan_id: planId });
  if (error) throw new Error(error.message);
  return data as AdvanceResult;
}

export async function advancePlanToConfirmed(planId: string): Promise<AdvanceResult> {
  const { data, error } = await supabase.rpc("advance_plan_to_confirmed", { p_plan_id: planId });
  if (error) throw new Error(error.message);
  return data as AdvanceResult;
}

export type CancelResult = "cancelled" | "already_cancelled" | "not_cancellable" | "not_found";

export async function cancelPlan(planId: string): Promise<CancelResult> {
  const { data, error } = await supabase.rpc("cancel_plan", { p_plan_id: planId });
  if (error) throw new Error(error.message);
  return data as CancelResult;
}
