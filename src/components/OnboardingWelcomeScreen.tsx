import crewLogo from "../assets/crew-logo.png";
import { PlanIntent } from "../navigation";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "./OnboardingProgress";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function OnboardingWelcomeScreen({ onNavigate }: Props) {
  return (
    <div className="phone-screen-inner">
      <OnboardingHeader step={1} total={4} onBack={() => onNavigate("back")} />
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center" }}>
          <OnboardingProgress step={1} total={4} />

          <img
            src={crewLogo}
            alt="Crew"
            style={{ width: "76px", height: "76px", borderRadius: "20px", marginTop: "22px" }}
          />
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "22px",
              marginTop: "18px",
              letterSpacing: "-0.01em",
            }}
          >
            Let's get you back outside.
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
            Create a Crew for the people you want to see more often.
          </p>

          <button
            className="btn btn-primary"
            style={{ marginTop: "24px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("onboardingName");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
