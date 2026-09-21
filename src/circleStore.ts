import { create } from "zustand";

type CircleStore = {
  currentCircleId: string | null;
  setCurrentCircleId: (id: string | null) => void;
};

export const useCircleStore = create<CircleStore>((set) => ({
  currentCircleId: null,
  setCurrentCircleId: (id) => set({ currentCircleId: id }),
}));
