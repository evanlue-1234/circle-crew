import { useEffect, useState } from "react";
import { ScreenId } from "../navigation";
import { screens } from "../screens";
import { useAppNavigate } from "../useAppNavigate";
import { BottomNav } from "./BottomNav";

type Props = {
  screen: ScreenId;
};

// Main, revisitable destinations get the tab bar. Everything else is a step in a linear
// flow (create a circle, plan something, vote, confirm) that shouldn't offer a way to
// jump to another section mid-flow.
const SCREENS_WITH_NAV = new Set<ScreenId>([
  "home",
  "discover",
  "plans",
  "memories",
  "circleHub",
  "confirmed",
  "recap",
  "profile",
]);

export function AppShell({ screen }: Props) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const onNavigate = useAppNavigate();
  const Screen = screens[screen];

  return (
    <div className="app-root">
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        onClick={() => setDark((d) => !d)}
      >
        {dark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          </svg>
        )}
      </button>
      <div className="phone-screen">
        <Screen onNavigate={onNavigate} />
        {SCREENS_WITH_NAV.has(screen) && <BottomNav active={screen} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
