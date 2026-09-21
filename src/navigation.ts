export type ScreenId =
  | "login" | "signup" | "home" | "circleHub" | "plans" | "setup"
  | "invite" | "spinner" | "captain" | "discover" | "poll" | "swipe"
  | "share" | "pending" | "match" | "vote" | "commit" | "confirmed"
  | "rhythm" | "recap" | "memories" | "profile";

export type PlanIntent =
  | "swipe" | "recommendations" | "saved" | "ownIdea" | "spinner" | "quickPlan";

/** After the preference poll completes, where the flow goes depends on intent. */
export const afterPoll: Record<PlanIntent, ScreenId> = {
  swipe: "swipe",
  saved: "swipe",
  recommendations: "match",
  ownIdea: "commit",
  spinner: "commit",
  quickPlan: "swipe",
};
