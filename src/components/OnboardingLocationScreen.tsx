import { useOnboardingStore } from "../onboardingStore";
import { PlanIntent } from "../navigation";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "./OnboardingProgress";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function OnboardingLocationScreen({ onNavigate }: Props) {
  const city = useOnboardingStore((s) => s.city);
  const setCity = useOnboardingStore((s) => s.setCity);

  const canContinue = city.trim().length > 0;

  return (
    <div className="phone-screen-inner">
      <OnboardingHeader step={3} total={4} onBack={() => onNavigate("back")} />
      <div className="screen-body">
        <div className="content-pad">
          <OnboardingProgress step={3} total={4} />

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "20px",
              marginTop: "18px",
            }}
          >
            Where are you based?
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            We'll use this as your default area for finding nearby ideas.
          </p>

          <label className="field-label" style={{ marginTop: "16px" }}>
            City
          </label>
          <input
            className="field-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Raleigh, NC"
            autoFocus
            autoComplete="address-level2"
          />

          {/* TODO: geolocation-based auto-fill — not built in this slice. */}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: "8px" }} disabled>
            📍 Use my current area (coming soon)
          </button>

          <button
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
            disabled={!canContinue}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("onboardingAccount");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
