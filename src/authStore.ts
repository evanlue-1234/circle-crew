import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type AuthStore = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export const useAuthStore = create<AuthStore>(() => ({
  session: null,
  user: null,
  loading: true,
}));

supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({ session, user: session?.user ?? null, loading: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session, user: session?.user ?? null, loading: false });
});
