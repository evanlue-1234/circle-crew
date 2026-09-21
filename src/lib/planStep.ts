import { hasUserCompletedPlan, hasUserRsvpd, hasUserVoted } from "./planCompletion";
import { PlanIntent, ScreenId } from "../navigation";

export type PlanStep = {
  screen: ScreenId;
  intent?: PlanIntent;
  /** Short, user-facing description of what they still need to do — "Waiting on others"
   * once their own part is done. */
  label: string;
  /** false once the user has done their part for the plan's current stage — screens still
   * render fine if navigated to (Vote/Commit already show their own "you're done" state), but
   * callers use this to decide whether a button should be a live CTA or a disabled one. */
  actionable: boolean;
};

/** Where a member should go next for a given plan, and what to call it — the single source
 * of truth for "what's next" so Circle Hub's resume button and the Plans tab's Pending
 * section agree instead of each guessing independently. */
export async function resolvePlanStep(planId: string, userId: string, status: string): Promise<PlanStep> {
  if (status === "collecting") {
    const done = await hasUserCompletedPlan(planId, userId);
    return done
      ? { screen: "pending", label: "Waiting on others", actionable: false }
      : { screen: "poll", intent: "swipe", label: "Answer the poll", actionable: true };
  }

  if (status === "voting") {
    const voted = await hasUserVoted(planId, userId);
    return voted
      ? { screen: "vote", label: "Waiting on others", actionable: false }
      : { screen: "vote", label: "Cast your vote", actionable: true };
  }

  if (status === "rsvp") {
    const rsvpd = await hasUserRsvpd(planId, userId);
    return rsvpd
      ? { screen: "commit", label: "Waiting on others", actionable: false }
      : { screen: "commit", label: "RSVP needed", actionable: true };
  }

  return { screen: "circleHub", label: "", actionable: false };
}
