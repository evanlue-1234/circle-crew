type Props = {
  step: number;
  total: number;
};

// Same .progress bar PollScreen already uses for its 7-question flow — reused as-is rather
// than inventing a second progress-indicator style.
export function OnboardingProgress({ step, total }: Props) {
  return (
    <div className="progress">
      <span style={{ width: `${(step / total) * 100}%` }}></span>
    </div>
  );
}
