import { FormEvent, useState } from "react";
import { consumePendingNdaAcceptance } from "../lib/ndaAcceptance";
import { supabase } from "../lib/supabase";
import { useOnboardingStore } from "../onboardingStore";
import { PlanIntent } from "../navigation";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "./OnboardingProgress";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const GOOGLE_OAUTH_ENABLED = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";

export function OnboardingAccountScreen({ onNavigate }: Props) {
  const firstName = useOnboardingStore((s) => s.firstName);
  const lastName = useOnboardingStore((s) => s.lastName);
  const city = useOnboardingStore((s) => s.city);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const name = `${firstName} ${lastName}`.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      await consumePendingNdaAcceptance(data.user.id).catch(() => {});
      // handle_new_user (the signup trigger) only seeds name/email from auth metadata — city
      // isn't part of it, so it's written here as a direct follow-up instead of changing that
      // trigger's behavior for every other signup path that uses it.
      await supabase.from("profiles").update({ city }).eq("id", data.user.id);
    }

    useOnboardingStore.getState().reset();
    onNavigate("onboardingComplete");
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="phone-screen-inner">
      <OnboardingHeader step={4} total={4} onBack={() => onNavigate("back")} />
      <div className="screen-body">
        <div className="content-pad">
          <OnboardingProgress step={4} total={4} />

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "20px",
              marginTop: "18px",
            }}
          >
            Create your account
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Last step — this is how you'll log back in.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="field-label" style={{ marginTop: "16px" }}>
              Email
            </label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="elizabeth@example.com"
              autoComplete="email"
              required
            />

            <label className="field-label" style={{ marginTop: "12px" }}>
              Password
            </label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />

            {error && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: "16px" }}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          {GOOGLE_OAUTH_ENABLED && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginTop: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                handleGoogle();
              }}
            >
              Continue with Google
            </button>
          )}

          <p
            style={{
              fontSize: "11px",
              color: "var(--text-faint)",
              textAlign: "center",
              marginTop: "12px",
            }}
          >
            By continuing you agree to Crew's Terms &amp; Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
