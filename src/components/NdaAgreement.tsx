import { useState } from "react";

type Props = {
  onAgree: () => void | Promise<void>;
  busy?: boolean;
};

// TODO: real NDA/CDA text — this is a short placeholder testing agreement only.
const NDA_TEXT = "I agree not to use ideas, concepts, or features from Crew for other projects.";

/** Hard gate for the testing phase — no backdrop-click dismiss, no way past it besides
 * agreeing. Reused both by SplashScreen (agreeing before an account exists) and NdaGate
 * (agreeing as an already-logged-in returning user who hasn't accepted yet). */
export function NdaAgreement({ onAgree, busy }: Props) {
  const [declined, setDeclined] = useState(false);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Before you continue</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          {NDA_TEXT}
        </p>
        {declined && (
          <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>
            You need to agree to continue using Crew during testing.
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onAgree();
            }}
          >
            {busy ? "Saving…" : "I Agree"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setDeclined(true);
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
