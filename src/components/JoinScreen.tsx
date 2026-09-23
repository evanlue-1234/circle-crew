import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../authStore";
import crewLogo from "../assets/crew-logo.png";
import { useCircleStore } from "../circleStore";
import { acceptCircleInvite, CircleInvitePreview, fetchCircleInvitePreview } from "../lib/circleInvites";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Phase = "loading" | "quickSignup" | "invite" | "notInvited";

const AVATAR_COLORS = ["#e2543a", "#1f7a6b", "#d19900", "#7a4fb0", "#3a8fb0"];

export function JoinScreen({ onNavigate }: Props) {
  const [searchParams] = useSearchParams();
  const circleId = searchParams.get("circle");
  const user = useAuthStore((s) => s.user);
  const setCurrentCircleId = useCircleStore((s) => s.setCurrentCircleId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<CircleInvitePreview | null>(null);

  // Quick-signup (only shown to a brand-new invited user — see the profiles.name check below).
  // First name + city only, per the invited flow being intentionally shorter than organic
  // onboarding's first+last name.
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const [invitePreview, { data: profile }] = await Promise.all([
          fetchCircleInvitePreview(circleId),
          supabase.from("profiles").select("name").eq("id", user.id).single(),
        ]);
        if (cancelled) return;
        if (!invitePreview) {
          setPhase("notInvited");
          return;
        }
        setPreview(invitePreview);
        // No name yet means this account was just created by the invite email (handle_new_user
        // has nothing to seed it with) — a returning user who's already completed onboarding
        // always has one, so they skip straight to the join prompt.
        setPhase(profile?.name ? "invite" : "quickSignup");
      } catch (err) {
        if (!cancelled) setJoinError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circleId, user]);

  const handleCompleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAccount(true);
    setAccountError(null);

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setSavingAccount(false);
      setAccountError(passwordError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: firstName.trim(), city })
      .eq("id", user.id);
    setSavingAccount(false);
    if (profileError) {
      setAccountError(profileError.message);
      return;
    }

    setPhase("invite");
  };

  const handleJoin = async () => {
    if (!circleId) return;
    setJoining(true);
    setJoinError(null);

    try {
      const result = await acceptCircleInvite(circleId);
      if (result === "not_invited") {
        setJoinError("You haven't been invited to this circle.");
        return;
      }
      setCurrentCircleId(circleId);
      onNavigate("circleHub");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

  const handleDismiss = () => {
    // Declining here doesn't lose the invite — it's still there under Home's Pending Invites
    // (circle_members stays status='invited' either way).
    onNavigate("home");
  };

  return (
    <div className="phone-screen-inner">
      <div className="app-header">
        <h2 style={{ fontSize: "16px" }}>Join circle</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center", paddingTop: "30px" }}>
          <img src={crewLogo} alt="Crew" style={{ width: "64px", height: "64px", borderRadius: "20px" }} />

          {!circleId && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 16 }}>
              This invite link is missing a circle.
            </p>
          )}

          {circleId && phase === "loading" && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16 }}>Loading…</p>
          )}

          {circleId && phase === "notInvited" && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 16 }}>
              You haven't been invited to this circle.
            </p>
          )}

          {circleId && phase === "quickSignup" && (
            <>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "700",
                  fontSize: "19px",
                  marginTop: "16px",
                }}
              >
                Finish setting up your account
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Just a couple details, then you're in.
              </p>

              <form onSubmit={handleCompleteAccount} style={{ textAlign: "left" }}>
                <label className="field-label" style={{ marginTop: "16px" }}>
                  Email
                </label>
                <input className="field-input" value={user?.email ?? ""} disabled />

                <label className="field-label" style={{ marginTop: "12px" }}>
                  First name
                </label>
                <input
                  className="field-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />

                <label className="field-label" style={{ marginTop: "12px" }}>
                  City
                </label>
                <input
                  className="field-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Raleigh, NC"
                  autoComplete="address-level2"
                  required
                />

                <label className="field-label" style={{ marginTop: "12px" }}>
                  Set a password
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

                {accountError && (
                  <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{accountError}</p>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: "16px" }}
                  disabled={savingAccount}
                >
                  {savingAccount ? "Saving…" : "Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {phase === "invite" && preview && (
        <div className="modal-backdrop" onClick={() => !joining && handleDismiss()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">You've been invited to join {preview.circleName}</div>
            {preview.inviterName && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                {preview.inviterName} invited you.
              </p>
            )}

            {preview.memberNames.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px" }}>
                <span className="avatar-stack">
                  {preview.memberNames.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="avatar"
                      title={name}
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {name[0]?.toUpperCase() ?? "?"}
                    </span>
                  ))}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {preview.memberNames.slice(0, 3).join(", ")}
                  {preview.memberNames.length > 3 ? ` +${preview.memberNames.length - 3} more` : ""}
                </span>
              </div>
            )}

            {joinError && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{joinError}</p>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" disabled={joining} onClick={handleJoin}>
                {joining ? "Joining…" : "Join now"}
              </button>
              <button type="button" className="btn btn-ghost" disabled={joining} onClick={handleDismiss}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
