import { useState } from "react";
import crewLogo from "../assets/crew-logo.png";
import { stashNdaAcceptance } from "../lib/ndaAcceptance";
import { PlanIntent } from "../navigation";
import { NdaAgreement } from "./NdaAgreement";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const GET_STARTED_DESTINATION = "onboardingWelcome";
const HAVE_INVITE_DESTINATION = "login";

type PendingDestination = typeof GET_STARTED_DESTINATION | typeof HAVE_INVITE_DESTINATION | null;

export function SplashScreen({ onNavigate }: Props) {
  const [pendingDestination, setPendingDestination] = useState<PendingDestination>(null);

  const handleAgree = () => {
    stashNdaAcceptance();
    if (pendingDestination) onNavigate(pendingDestination);
    setPendingDestination(null);
  };

  return (
    <div className="phone-screen-inner">
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center", paddingTop: "28px" }}>
          <img
            src={crewLogo}
            alt="Crew"
            style={{ width: "84px", height: "84px", borderRadius: "22px" }}
          />
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "23px",
              marginTop: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            Finally make plans that stick.
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "8px",
              lineHeight: "1.5",
              padding: "0 8px",
            }}
          >
            Crew helps your people figure out what to do, when to do it, and who's taking the
            lead.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "26px" }}>
            <div
              className="card"
              style={{ flex: 1, background: "var(--surface-2)", padding: "16px 8px", margin: 0 }}
            >
              <div style={{ fontSize: "24px" }}>😕</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                "Maybe next time…"
              </div>
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: "16px" }}>→</div>
            <div
              className="card"
              style={{ flex: 1, background: "var(--primary-soft)", padding: "16px 8px", margin: 0 }}
            >
              <div style={{ fontSize: "24px" }}>🎉</div>
              <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "6px" }}>
                Plans to look forward to
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: "28px" }}
            onClick={(e) => {
              e.stopPropagation();
              setPendingDestination(GET_STARTED_DESTINATION);
            }}
          >
            Get Started
          </button>
          <button
            className="btn btn-outline"
            style={{ marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              setPendingDestination(HAVE_INVITE_DESTINATION);
            }}
          >
            I Have an Invite
          </button>
          <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "10px" }}>
            Plans are better together
          </p>
        </div>
      </div>

      {pendingDestination && <NdaAgreement onAgree={handleAgree} />}
    </div>
  );
}
