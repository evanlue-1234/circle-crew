import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function OnboardingCompleteScreen({ onNavigate }: Props) {
  return (
    <div className="phone-screen-inner">
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center", paddingTop: "40px" }}>
          <div style={{ fontSize: "48px" }}>🎉</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "22px",
              marginTop: "14px",
              letterSpacing: "-0.01em",
            }}
          >
            Congrats — you're in!
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
            Your account is ready. Create a Crew for the people you want to see more, or
            browse ideas for what to do together.
          </p>

          <button
            className="btn btn-primary"
            style={{ marginTop: "24px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("setup");
            }}
          >
            Create a Circle
          </button>
          <button
            className="btn btn-outline"
            style={{ marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("discover");
            }}
          >
            Explore Ideas
          </button>
        </div>
      </div>
    </div>
  );
}
