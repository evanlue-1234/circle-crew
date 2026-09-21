import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function CaptainScreen({ onNavigate }: Props) {
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
        <h2 style={{ fontSize: "16px" }}>Plan Captain</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div className="intro-banner">
            <h3>You're up, Jordan 👋</h3>
            <p>
              Start the College Crew's November plan. It takes about two minutes
              to get the group moving.
            </p>
          </div>
          <div className="section-label" style={{ padding: "0" }}>
            How should we choose?
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "8px",
              borderColor: "var(--primary)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("poll", "swipe");
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--primary-soft)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
              }}
            >
              🎲
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                Swipe through local ideas
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Everyone swipes a deck. App finds the matches.
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "8px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("poll", "recommendations");
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--teal-soft)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
              }}
            >
              ✨
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                Find two recommendations
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Collect likes/dislikes, get 2 options.
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-faint)"
              strokeWidth="2"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "8px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("poll", "saved");
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--gold-soft)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
              }}
            >
              🔖
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                Use saved ideas
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Pick from what the group already liked.
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-faint)"
              strokeWidth="2"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "8px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("poll", "ownIdea");
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--surface-2)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
              }}
            >
              💡
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontWeight: "600", fontSize: "13px" }}>
                I already have an idea
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Propose your own activity.
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-faint)"
              strokeWidth="2"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <button
            className="btn btn-outline"
            style={{ marginTop: "6px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("circleHub");
            }}
          >
            Pass this round
          </button>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-faint)",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            Auto-pilot: if Jordan doesn't start by Sunday, the app launches a
            vote using saved preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
