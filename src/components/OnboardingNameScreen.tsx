import { useOnboardingStore } from "../onboardingStore";
import { PlanIntent } from "../navigation";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "./OnboardingProgress";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function OnboardingNameScreen({ onNavigate }: Props) {
  const firstName = useOnboardingStore((s) => s.firstName);
  const lastName = useOnboardingStore((s) => s.lastName);
  const setFirstName = useOnboardingStore((s) => s.setFirstName);
  const setLastName = useOnboardingStore((s) => s.setLastName);

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className="phone-screen-inner">
      <OnboardingHeader step={2} total={4} onBack={() => onNavigate("back")} />
      <div className="screen-body">
        <div className="content-pad">
          <OnboardingProgress step={2} total={4} />

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "20px",
              marginTop: "18px",
            }}
          >
            What's your name?
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            This is how friends will see you in member lists and RSVPs.
          </p>

          <label className="field-label" style={{ marginTop: "16px" }}>
            First name
          </label>
          <input
            className="field-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Elizabeth"
            autoFocus
            autoComplete="given-name"
          />

          <label className="field-label" style={{ marginTop: "12px" }}>
            Last name
          </label>
          <input
            className="field-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Vance"
            autoComplete="family-name"
          />

          <button
            className="btn btn-primary"
            style={{ marginTop: "20px" }}
            disabled={!canContinue}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("onboardingLocation");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
