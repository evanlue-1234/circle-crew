type Props = {
  step: number;
  total: number;
  onBack: () => void;
};

// Same back-chevron/app-header shape every other screen in the app already uses.
export function OnboardingHeader({ step, total, onBack }: Props) {
  return (
    <div className="app-header">
      <button
        className="ghost-btn"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        Step {step} of {total}
      </span>
      <div style={{ width: "34px" }}></div>
    </div>
  );
}
