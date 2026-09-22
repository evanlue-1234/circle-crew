import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function SignupScreen({ onNavigate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (from) navigate(from, { replace: true });
    else onNavigate("home");
  };

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
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
              Create your account
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="signup-name">
              Name
            </label>
            <input
              id="signup-name"
              className="field-input"
              type="text"
              placeholder="Elizabeth V."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />

            <label
              className="field-label"
              htmlFor="signup-email"
              style={{ marginTop: 12 }}
            >
              Email
            </label>
            <input
              id="signup-email"
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
              htmlFor="signup-phone"
              style={{ marginTop: 12 }}
            >
              Phone{" "}
              <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>
                (for group texts)
              </span>
            </label>
            <input
              id="signup-phone"
              className="field-input"
              type="tel"
              placeholder="(919) 555-0142"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />

            <label
              className="field-label"
              htmlFor="signup-password"
              style={{ marginTop: 12 }}
            >
              Password
            </label>
            <input
              id="signup-password"
              className="field-input"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              style={{ marginTop: 16 }}
              disabled={submitting}
            >
              Create account
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
          <p
            style={{
              fontSize: 11,
              color: "var(--text-faint)",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            By continuing you agree to Crew's Terms &amp; Privacy.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Already have an account?{" "}
            <b
              style={{ color: "var(--primary)", cursor: "pointer" }}
              onClick={() => onNavigate("login")}
            >
              Log in
            </b>
          </p>
        </div>
      </div>
    </div>
  );
}
