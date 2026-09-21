import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function MatchScreen({ onNavigate }: Props) {
  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="app-header">
        <button
          className="ghost-btn"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("back");
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px" }}>Matches</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="avatar-stack">
              <span className="avatar" style={{ background: "#e2543a" }}>
                M
              </span>
              <span className="avatar" style={{ background: "#1f7a6b" }}>
                C
              </span>
              <span className="avatar" style={{ background: "#d19900" }}>
                J
              </span>
              <span className="avatar" style={{ background: "#7a4fb0" }}>
                P
              </span>
              <span className="avatar" style={{ background: "#3a8fb0" }}>
                A
              </span>
              <span className="avatar" style={{ background: "#d96a8a" }}>
                S
              </span>
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              6 of 6 voted
            </span>
          </div>
          <div className="why-box" style={{ marginTop: "10px" }}>
            Your group leaned toward <b>playful, social activities</b>. We
            bridged everyone&rsquo;s preferences into two options that work for
            the whole group.
          </div>
          <div
            className="section-label"
            style={{ padding: "0", marginTop: "12px" }}
          >
            Practical favorite
          </div>
          <div className="opt-card">
            <div className="opt-head">
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg,#d9956a,#7a3b2e)",
                  flexShrink: "0",
                }}
              ></div>
              <div style={{ flex: "1" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  Food Festival &amp; Live Music
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  Sat, Oct 17 · 11–3 PM
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <span className="tag tag-teal">4 likely</span>
                  <span className="tag tag-soft">$20–$30</span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="section-label"
            style={{ padding: "0", marginTop: "8px" }}
          >
            Enthusiastic wildcard
          </div>
          <div className="opt-card">
            <div className="opt-head">
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg,#4b2f7a,#d96a8a)",
                  flexShrink: "0",
                }}
              ></div>
              <div style={{ flex: "1" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  Comedy Show &amp; Dessert
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  Fri, Oct 23 · 8 PM
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <span className="tag tag-gold">3 likely · 🔥 strong</span>
                  <span className="tag tag-soft">$35–$50</span>
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "10px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("vote");
            }}
          >
            Choose between these two
          </button>
        </div>
      </div>
    </div>
  );
}
