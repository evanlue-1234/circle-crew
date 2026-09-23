import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function RecapScreen({ onNavigate }: Props) {
  return (
    <div className="phone-screen-inner">
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
        <h2 style={{ fontSize: "16px" }}>Recap</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: "14px" }}>
          <div className="celebrate" style={{ paddingTop: "0" }}>
            <div className="big-emoji">📸</div>
            <h3>How was it?</h3>
          </div>
          <div
            className="chip-row"
            style={{ padding: "0", justifyContent: "center", flexWrap: "wrap" }}
          >
            <span className="chip primary">❤️ Loved it</span>
            <span className="chip">🔁 Would do again</span>
            <span className="chip">👌 Good once</span>
          </div>
          <div
            className="section-label"
            style={{ padding: "0", marginTop: "14px" }}
          >
            Add photos
          </div>
          <div className="recap-photos">
            <div
              className="rp"
              style={{ background: "linear-gradient(135deg,#4b2f7a,#d96a8a)" }}
            ></div>
            <div
              className="rp"
              style={{ background: "linear-gradient(135deg,#d9956a,#7a3b2e)" }}
            ></div>
            <div
              className="rp"
              style={{ background: "linear-gradient(135deg,#1f7a6b,#3a8fb0)" }}
            ></div>
          </div>
          <div
            className="card"
            style={{ background: "var(--surface-2)", marginTop: "10px" }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              College Crew — Oct 2026
            </div>
            <div className="stat-grid" style={{ marginTop: "10px" }}>
              <div className="stat">
                <div className="s-num">5</div>
                <div className="s-lbl">attended</div>
              </div>
              <div className="stat">
                <div className="s-num">12</div>
                <div className="s-lbl">photos</div>
              </div>
              <div className="stat">
                <div className="s-num">4.5</div>
                <div className="s-lbl">rating</div>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "12px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("memories");
            }}
          >
            Save to memories
          </button>
          <button
            className="btn btn-ghost"
            style={{ marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("captain");
            }}
          >
            Find something similar &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
