import { supabase } from "./supabase";

// A logged-out visitor can agree to the NDA on the Splash screen before an account exists to
// attach it to (see NdaAgreement/SplashScreen). This stashes that agreement until the
// following signup/login actually authenticates them, at which point Login/SignupScreen call
// consumePendingNdaAcceptance to write it for real.
const STASH_KEY = "crew_nda_pending_accept";

export function stashNdaAcceptance() {
  sessionStorage.setItem(STASH_KEY, "1");
}

export async function acceptNdaForUser(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ nda_accepted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Called right after a successful login/signup — writes the NDA acceptance that was agreed
 * to pre-auth, if any. No-op (including for a returning user who already accepted long ago
 * and never touched the Splash gate this session) when nothing was stashed. */
export async function consumePendingNdaAcceptance(userId: string) {
  if (sessionStorage.getItem(STASH_KEY) !== "1") return;
  sessionStorage.removeItem(STASH_KEY);
  await acceptNdaForUser(userId);
}
