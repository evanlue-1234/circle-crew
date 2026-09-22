import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Notice = { kind: "error" | "info"; message: string };

export function LoginScreen({ onNavigate }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Set by RequireAuth when it bounced an unauthenticated visit here (e.g. an invite link) —
  // returning there afterward instead of always landing on Home.
  const from = (location.state as { from?: string } | null)?.from ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setNotice({ kind: "error", message: error.message });
      return;
    }
    if (from) navigate(from, { replace: true });
    else onNavigate("home");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setNotice({ kind: "error", message: "Enter your email above first." });
      return;
    }
    setNotice(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setSubmitting(false);
    if (error) {
      setNotice({ kind: "error", message: error.message });
      return;
    }
    setNotice({ kind: "info", message: "Check your email for a reset link." });
  };

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: 30 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 15,
                background: "var(--primary)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 24,
              }}
            >
              C
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 20,
                marginTop: 10,
              }}
            >
              Crew
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="field-input"
              type="email"
              placeholder="elizabeth@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label
              className="field-label"
              htmlFor="login-password"
              style={{ marginTop: 14 }}
            >
              Password
            </label>
            <input
              id="login-password"
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {notice && (
              <p
                style={{
                  fontSize: 12,
                  color: notice.kind === "error" ? "var(--warn)" : "var(--text-muted)",
                  marginTop: 10,
                }}
              >
                {notice.message}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              disabled={submitting}
            >
              Log in
            </button>
          </form>

          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 8 }}
            onClick={() => onNavigate("home")}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 8, fontSize: 12 }}
            disabled={submitting}
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 14,
            }}
          >
            Don't have an account?{" "}
            <b
              style={{ color: "var(--primary)", cursor: "pointer" }}
              onClick={() => onNavigate("signup")}
            >
              Sign up
            </b>
          </p>
        </div>
      </div>
    </div>
  );
}
