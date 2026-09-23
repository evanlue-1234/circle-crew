import { create } from "zustand";

// Holds what's collected across OnboardingName/OnboardingLocation until OnboardingAccount
// actually creates the auth user — there's no profile row to persist to before that.
type OnboardingStore = {
  firstName: string;
  lastName: string;
  city: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setCity: (v: string) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  firstName: "",
  lastName: "",
  city: "",
  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setCity: (city) => set({ city }),
  reset: () => set({ firstName: "", lastName: "", city: "" }),
}));
