import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  /** Tighter padding for use inside an existing section (e.g. Circle Hub), vs a full-screen
   * empty state (e.g. Memories) which wants more breathing room above it. */
  compact?: boolean;
};

/** Shared "this isn't built yet" placeholder — same icon-tile/heading/subtext shape wherever
 * a feature is deliberately deferred, so it reads as intentional rather than broken. */
export function ComingSoon({ title, subtitle, icon, compact }: Props) {
  return (
    <div style={{ textAlign: "center", padding: compact ? "12px 0 4px" : "22px 0 0" }}>
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "18px",
          background: "var(--primary-soft)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "700",
          fontSize: "19px",
          marginTop: "14px",
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{subtitle}</p>
    </div>
  );
}
