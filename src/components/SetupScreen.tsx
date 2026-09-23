import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../authStore";
import { useCircleStore } from "../circleStore";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Frequency = "Weekly" | "Biweekly" | "Monthly" | "Random";
type Budget = "<$20" | "$20–$50" | "$50–$100" | ">$100";
type Travel = "Local" | "Willing to Drive" | "No Limit";
type Day = "M" | "T" | "W" | "Th" | "F" | "Sa" | "Sun";
type TimeOfDay = "Mornings" | "Afternoons" | "Evenings";
type TileKey = "frequency" | "budget" | "travel" | "days";

const FREQUENCY_OPTIONS: Frequency[] = ["Weekly", "Biweekly", "Monthly", "Random"];
const BUDGET_OPTIONS: Budget[] = ["<$20", "$20–$50", "$50–$100", ">$100"];
const TRAVEL_OPTIONS: Travel[] = ["Local", "Willing to Drive", "No Limit"];
const DAY_OPTIONS: Day[] = ["M", "T", "W", "Th", "F", "Sa", "Sun"];
const TIME_OPTIONS: TimeOfDay[] = ["Mornings", "Afternoons", "Evenings"];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function SetupScreen({ onNavigate }: Props) {
  const [circleName, setCircleName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setCurrentCircleId = useCircleStore((s) => s.setCurrentCircleId);

  const [openTile, setOpenTile] = useState<TileKey | null>(null);
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [travel, setTravel] = useState<Travel | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [times, setTimes] = useState<TimeOfDay[]>([]);

  const prefGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (prefGridRef.current && !prefGridRef.current.contains(e.target as Node)) {
        setOpenTile(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTile = (tile: TileKey) => {
    setOpenTile((current) => (current === tile ? null : tile));
  };

  const toggleDay = (day: Day) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const toggleTime = (time: TimeOfDay) => {
    setTimes((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]));
  };

  const daysTimesSummary =
    days.length === 0 && times.length === 0
      ? null
      : [days.join(", "), times.join(", ")].filter(Boolean).join(" · ");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const user = useAuthStore.getState().user;
    if (!user) return;

    setError(null);
    setSubmitting(true);

    const { data: circle, error: circleError } = await supabase
      .from("circles")
      .insert({
        name: circleName,
        description: description || null,
        city: "Raleigh, NC",
        created_by: user.id,
      })
      .select()
      .single();

    if (circleError || !circle) {
      setSubmitting(false);
      setError(circleError?.message ?? "Couldn't create the circle.");
      return;
    }

    const { error: memberError } = await supabase
      .from("circle_members")
      .insert({ circle_id: circle.id, user_id: user.id, status: "active" });

    setSubmitting(false);
    if (memberError) {
      setError(memberError.message);
      return;
    }

    setCurrentCircleId(circle.id);
    onNavigate("invite");
  };

  return (
    <div className="phone-screen-inner">
      <div className="app-header">
        <button className="ghost-btn" onClick={() => onNavigate("back")}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 style={{ fontSize: 16 }}>Create circle</h2>
        <div style={{ width: 34 }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="setup-name">
              Circle name
            </label>
            <input
              id="setup-name"
              className="field-input"
              type="text"
              style={{ fontWeight: 500 }}
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              required
            />

            <label
              className="field-label"
              htmlFor="setup-description"
              style={{ marginTop: 14 }}
            >
              Description (optional)
            </label>
            <textarea
              id="setup-description"
              className="field-input"
              placeholder="Friends from State University"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ resize: "none" }}
            />

            <div className="section-label" style={{ padding: 0 }}>
              Preferences · skippable
            </div>
            <div className="pref-grid" ref={prefGridRef}>
              <div className="pref-tile">
                <button
                  type="button"
                  className={openTile === "frequency" ? "pref-tile-btn open" : "pref-tile-btn"}
                  onClick={() => toggleTile("frequency")}
                >
                  <span className="pref-tile-label">
                    Frequency
                    <Chevron />
                  </span>
                  <span className={frequency ? "pref-tile-value" : "pref-tile-value placeholder"}>
                    {frequency ?? "Any"}
                  </span>
                </button>
                {openTile === "frequency" && (
                  <div className="pref-dropdown">
                    <div className="pref-option-list">
                      {FREQUENCY_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={option === frequency ? "pref-option selected" : "pref-option"}
                          onClick={() => {
                            setFrequency(option);
                            setOpenTile(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pref-tile">
                <button
                  type="button"
                  className={openTile === "budget" ? "pref-tile-btn open" : "pref-tile-btn"}
                  onClick={() => toggleTile("budget")}
                >
                  <span className="pref-tile-label">
                    Budget
                    <Chevron />
                  </span>
                  <span className={budget ? "pref-tile-value" : "pref-tile-value placeholder"}>
                    {budget ?? "Any"}
                  </span>
                </button>
                {openTile === "budget" && (
                  <div className="pref-dropdown">
                    <div className="pref-option-list">
                      {BUDGET_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={option === budget ? "pref-option selected" : "pref-option"}
                          onClick={() => {
                            setBudget(option);
                            setOpenTile(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pref-tile">
                <button
                  type="button"
                  className={openTile === "travel" ? "pref-tile-btn open" : "pref-tile-btn"}
                  onClick={() => toggleTile("travel")}
                >
                  <span className="pref-tile-label">
                    Travel
                    <Chevron />
                  </span>
                  <span className={travel ? "pref-tile-value" : "pref-tile-value placeholder"}>
                    {travel ?? "Any"}
                  </span>
                </button>
                {openTile === "travel" && (
                  <div className="pref-dropdown">
                    <div className="pref-option-list">
                      {TRAVEL_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={option === travel ? "pref-option selected" : "pref-option"}
                          onClick={() => {
                            setTravel(option);
                            setOpenTile(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pref-tile">
                <button
                  type="button"
                  className={openTile === "days" ? "pref-tile-btn open" : "pref-tile-btn"}
                  onClick={() => toggleTile("days")}
                >
                  <span className="pref-tile-label">
                    Best Days &amp; Times
                    <Chevron />
                  </span>
                  <span className={daysTimesSummary ? "pref-tile-value" : "pref-tile-value placeholder"}>
                    {daysTimesSummary ?? "Any"}
                  </span>
                </button>
                {openTile === "days" && (
                  <div className="pref-dropdown">
                    <div className="pref-dropdown-group-label">Days</div>
                    <div className="pref-chip-grid">
                      {DAY_OPTIONS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={days.includes(day) ? "pref-chip selected" : "pref-chip"}
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="pref-dropdown-group-label">Time of day</div>
                    <div className="pref-chip-grid">
                      {TIME_OPTIONS.map((time) => (
                        <button
                          key={time}
                          type="button"
                          className={times.includes(time) ? "pref-chip selected" : "pref-chip"}
                          onClick={() => toggleTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ margin: "2px 10px 4px", width: "calc(100% - 20px)" }}
                      onClick={() => setOpenTile(null)}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              disabled={submitting}
            >
              Create circle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
