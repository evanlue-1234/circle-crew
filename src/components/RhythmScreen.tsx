import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function RhythmScreen({ onNavigate }: Props) {
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
        <h2 style={{ fontSize: "16px" }}>Keep it going</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: "14px" }}>
          <div className="celebrate" style={{ paddingTop: "0" }}>
            <div className="big-emoji">🔁</div>
            <h3>Make this a tradition?</h3>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Your group has met twice recently. Set a gentle reminder.
            </div>
          </div>
          <div className="commit-opt sel" style={{ marginBottom: "8px" }}>
            <span className="radio"></span>
            <div style={{ fontWeight: "600", fontSize: "13px" }}>
              Every 6 weeks
            </div>
          </div>
          <div className="commit-opt" style={{ marginBottom: "8px" }}>
            <span className="radio"></span>
            <div style={{ fontWeight: "600", fontSize: "13px" }}>
              First Saturday, every other month
            </div>
          </div>
          <div className="commit-opt" style={{ marginBottom: "8px" }}>
            <span className="radio"></span>
            <div style={{ fontWeight: "600", fontSize: "13px" }}>
              Quarterly weekend trip
            </div>
          </div>
          <div className="commit-opt" style={{ marginBottom: "8px" }}>
            <span className="radio"></span>
            <div style={{ fontWeight: "600", fontSize: "13px" }}>
              Birthdays &amp; milestones only
            </div>
          </div>
          <div className="section-label" style={{ padding: "0" }}>
            Group traditions
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🥞</span>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                First Saturday brunch
              </div>
            </div>
            <span className="tag tag-soft">Monthly</span>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🎓</span>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                Annual college reunion
              </div>
            </div>
            <span className="tag tag-soft">Yearly</span>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "10px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("recap");
            }}
          >
            Set group rhythm
          </button>
        </div>
      </div>
    </div>
  );
}
