import { create } from "zustand";
import { PlanIntent } from "./navigation";

export type PollAnswers = {
  daysFree: string[];
  timesFree: string[];
  drive: string | null;
  budget: string | null;
  vibe: number;
  energy: number;
  notInMood: string[];
};

type PlanStore = {
  intent: PlanIntent;
  setIntent: (intent: PlanIntent) => void;
  // The plan (session) currently being worked on — set by CircleHub before navigating to
  // the poll internally. A deep-linked visit (?plan=<id>) reads the id from the URL instead,
  // since a fresh session/device won't have this populated.
  currentPlanId: string | null;
  setCurrentPlanId: (id: string | null) => void;
};

export const usePlanStore = create<PlanStore>((set) => ({
  intent: "swipe",
  setIntent: (intent) => set({ intent }),
  currentPlanId: null,
  setCurrentPlanId: (currentPlanId) => set({ currentPlanId }),
}));
