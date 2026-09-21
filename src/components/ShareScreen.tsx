import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function ShareScreen({ onNavigate }: Props) {
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
        <h2 style={{ fontSize: "16px" }}>Group poll</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "18px",
            }}
          >
            Jordan needs your input
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            A quick 4-question poll decides our October plan. Answer
            availability, vibe, budget, and drive distance &mdash; the app finds
            our best match. Takes about a minute.
          </p>
          <div
            className="card"
            style={{ background: "var(--surface-2)", marginTop: "14px" }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Poll
            </div>
            <div
              style={{ fontWeight: "600", fontSize: "13px", marginTop: "2px" }}
            >
              College Crew · October
            </div>
            <div className="divider-line"></div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Questions</span>
              <b>4</b>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Answered</span>
              <b>2 of 6</b>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Deadline</span>
              <b>Thursday 8 PM</b>
            </div>
          </div>
          <div className="section-label" style={{ padding: "0" }}>
            Message preview
          </div>
          <div
            className="card"
            style={{
              background: "var(--surface-2)",
              fontSize: "12px",
              lineHeight: "1.55",
              color: "var(--text-muted)",
            }}
          >
            "Jordan started a poll for our October plan — answer 4 quick
            questions (availability, vibe, budget, distance) so we can find a
            time and activity that works for everyone. Takes a minute.{" "}
            <b style={{ color: "var(--primary)" }}>crew.app/poll/x7K2</b>"
          </div>
          <button
            className="btn btn-dark"
            style={{ marginTop: "6px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("pending");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Send via Messages
          </button>
          <button className="btn btn-ghost" style={{ marginTop: "8px" }}>
            Copy link
          </button>
          <button className="btn btn-ghost" style={{ marginTop: "8px" }}>
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
