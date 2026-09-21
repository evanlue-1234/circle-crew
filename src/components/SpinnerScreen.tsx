import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function SpinnerScreen({ onNavigate }: Props) {
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
          back
        </button>
        <h2>College Crew</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center" }}>
          <div
            className="section-label"
            style={{ padding: "0", textAlign: "center" }}
          >
            No idea what to do?
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Spin the wheel for a random idea your group can react to.
          </p>
          <div style={{ marginTop: "18px" }}>
            <div className="wheel-pointer"></div>
            <div className="wheel">
              <div className="wheel-names">
                <span
                  className="wn"
                  style={{ transform: "rotate(30deg) translateX(-10px)" }}
                >
                  Trivia
                </span>
                <span
                  className="wn"
                  style={{ transform: "rotate(90deg) translateX(-14px)" }}
                >
                  Food Fest
                </span>
                <span
                  className="wn"
                  style={{ transform: "rotate(150deg) translateX(-12px)" }}
                >
                  Comedy
                </span>
                <span
                  className="wn"
                  style={{ transform: "rotate(210deg) translateX(-10px)" }}
                >
                  Movie
                </span>
                <span
                  className="wn"
                  style={{ transform: "rotate(270deg) translateX(-8px)" }}
                >
                  Brewery
                </span>
                <span
                  className="wn"
                  style={{ transform: "rotate(330deg) translateX(-12px)" }}
                >
                  Game Night
                </span>
              </div>
              <div className="winner-badge">
                <div className="wb-inner">
                  <div>
                    <div style={{ fontSize: "11px", opacity: ".9" }}>
                      Your spin
                    </div>
                    Trivia
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "17px",
              marginTop: "20px",
            }}
          >
            Brewery Trivia Night
          </div>
          <div
            className="meta-row"
            style={{ justifyContent: "center", marginTop: "4px" }}
          >
            <span>Fri, Oct 16 · 7 PM</span>
            <span className="dot"></span>
            <span>15 min away</span>
            <span className="dot"></span>
            <span>$</span>
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("poll", "spinner");
            }}
          >
            Pitch this to the group
          </button>
          <button
            className="btn btn-ghost"
            style={{ marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("spinner");
            }}
          >
            Spin again
          </button>
        </div>
      </div>
    </div>
  );
}
