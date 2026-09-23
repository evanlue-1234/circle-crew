import { MouseEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../authStore";
import { loadDeckForPlan, SELECT_TARGET } from "../lib/ideaDeck";
import { advancePlanToVoting } from "../lib/planAggregation";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { PollAnswers, usePlanStore } from "../store";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type DriveKey = "short" | "dontMind" | "dayTrip";
type BudgetKey = "yes" | "soso" | "nope";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = ["Mornings", "Afternoons", "Evenings"];
const DRIVE_OPTIONS: { key: DriveKey; label: string }[] = [
  { key: "short", label: "Short (< 20 min)" },
  { key: "dontMind", label: "I don't mind driving (< 1 hr)" },
  { key: "dayTrip", label: "Day trip (< 3 hours)" },
];
const BUDGET_OPTIONS: { key: BudgetKey; label: string }[] = [
  { key: "yes", label: "Yes! (< $20)" },
  { key: "soso", label: "So-so (< $50)" },
  { key: "nope", label: "Nope! ($50+)" },
];
const VIBE_LABELS = ["Laid-back", "Neutral", "Lively"];
const ENERGY_LABELS = ["Chill", "Neutral", "Let's Move!"];
const NOT_IN_MOOD = [
  "Kid-friendly",
  "Bars & Clubs",
  "Restaurants",
  "Recreation Parks",
  "Workshops & Classes",
];

function toggleIn(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={checked ? "checkbox-row checked" : "checkbox-row"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span className="checkbox-box">
        <Check />
      </span>
      {label}
    </button>
  );
}

export function PollScreen({ onNavigate }: Props) {
  const currentPlanId = usePlanStore((s) => s.currentPlanId);
  const setCurrentPlanId = usePlanStore((s) => s.setCurrentPlanId);
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();

  // A deep-linked visit (?plan=<id>, e.g. from a copied invite) carries its own plan id in
  // the URL since a fresh session/device won't have currentPlanId populated. Adopt it into
  // the store so the rest of the flow (Swipe, etc.) can keep reading currentPlanId as usual.
  const planIdFromUrl = searchParams.get("plan");
  const planId = planIdFromUrl ?? currentPlanId;

  useEffect(() => {
    if (planIdFromUrl && planIdFromUrl !== currentPlanId) {
      setCurrentPlanId(planIdFromUrl);
    }
  }, [planIdFromUrl, currentPlanId, setCurrentPlanId]);

  const [daysFree, setDaysFree] = useState<string[]>([]);
  const [timesFree, setTimesFree] = useState<string[]>([]);
  const [drive, setDrive] = useState<DriveKey | null>(null);
  const [budget, setBudget] = useState<BudgetKey | null>(null);
  const [vibe, setVibe] = useState(1);
  const [energy, setEnergy] = useState(1);
  const [notInMood, setNotInMood] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildAnswers = (): PollAnswers => ({
    daysFree,
    timesFree,
    drive,
    budget,
    vibe,
    energy,
    notInMood,
  });

  // Each question requires an answer before the next one unlocks. Q5/Q6 are sliders that
  // always hold a value (there's no "unset" position), so they count as answered as soon as
  // they're reachable — the only questions that gate on a real user action are the ones with
  // no default (checkboxes/chips starting empty or null). Q7 is optional — "nothing" is a
  // valid answer — so it never blocks the buttons below it.
  const answered1 = daysFree.length > 0;
  const answered2 = timesFree.length > 0;
  const answered3 = drive !== null;
  const answered4 = budget !== null;
  const answered5 = true;
  const answered6 = true;
  const answered7 = true;

  const visible1 = true;
  const visible2 = visible1 && answered1;
  const visible3 = visible2 && answered2;
  const visible4 = visible3 && answered3;
  const visible5 = visible4 && answered4;
  const visible6 = visible5 && answered5;
  const visible7 = visible6 && answered6;
  const allAnswered = visible7 && answered7;

  const questionsAnswered = [
    answered1,
    visible2 && answered2,
    visible3 && answered3,
    visible4 && answered4,
    visible5 && answered5,
    visible6 && answered6,
    visible7 && answered7,
  ].filter(Boolean).length;

  const persistAnswers = async () => {
    if (!planId || !user) return false;
    setSubmitting(true);
    setError(null);
    const { error: upsertError } = await supabase.from("plan_responses").upsert({
      plan_id: planId,
      user_id: user.id,
      days: daysFree,
      times: timesFree,
      drive,
      budget,
      vibe,
      energy,
      not_in_mood: notInMood,
    });
    setSubmitting(false);
    if (upsertError) {
      setError(upsertError.message);
      return false;
    }
    return true;
  };

  const handleSwipeThroughEvents = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!(await persistAnswers())) return;
    onNavigate("afterPoll");
  };

  const handleChooseForMe = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!planId || !user) return;
    if (!(await persistAnswers())) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data: profile } = await supabase.from("profiles").select("city").eq("id", user.id).single();
      const deck = await loadDeckForPlan({
        planId,
        userId: user.id,
        userCity: profile?.city ?? null,
        answers: buildAnswers(),
      });
      const top = deck.slice(0, SELECT_TARGET);
      if (top.length < SELECT_TARGET) {
        setError("Not enough matches for your filters — try broadening your answers.");
        return;
      }
      for (const idea of top) {
        const { error: swipeError } = await supabase
          .from("swipes")
          .upsert({ idea_id: idea.id, user_id: user.id, direction: "like" });
        if (swipeError) throw new Error(swipeError.message);
      }
      // Best-effort: if this fails, PendingScreen's own poll (or another member's
      // completion) will still catch the group being done and advance the plan.
      advancePlanToVoting(planId).catch(() => {});
      onNavigate("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px" }}>Preferred type of event</h2>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{questionsAnswered} of 7</span>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          {!planId && (
            <p style={{ fontSize: 13, color: "var(--warn)" }}>
              No plan selected — start one from a circle, or open an invite link.
            </p>
          )}

          <div className="progress">
            <span style={{ width: `${(questionsAnswered / 7) * 100}%` }}></span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "19px",
              letterSpacing: "-0.01em",
              marginTop: "14px",
            }}
          >
            A few quick questions
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            Your answers shape the activity cards you'll swipe through.
          </p>

          <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
            1 · What days are you free?
          </div>
          <div className="checkbox-list">
            {DAYS.map((day) => (
              <CheckboxRow
                key={day}
                label={day}
                checked={daysFree.includes(day)}
                onToggle={() => setDaysFree((prev) => toggleIn(prev, day))}
              />
            ))}
          </div>
          {!answered1 && (
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
              Pick at least one to continue.
            </p>
          )}

          {visible2 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                2 · What times are you free?
              </div>
              <div className="checkbox-list">
                {TIMES.map((time) => (
                  <CheckboxRow
                    key={time}
                    label={time}
                    checked={timesFree.includes(time)}
                    onToggle={() => setTimesFree((prev) => toggleIn(prev, time))}
                  />
                ))}
              </div>
              {!answered2 && (
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                  Pick at least one to continue.
                </p>
              )}
            </>
          )}

          {visible3 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                3 · How far are you willing to drive?
              </div>
              <div className="chip-row" style={{ padding: "0" }}>
                {DRIVE_OPTIONS.map((option) => (
                  <span
                    key={option.key}
                    className={option.key === drive ? "chip active" : "chip"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrive(option.key);
                    }}
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {visible4 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                4 · On a budget?
              </div>
              <div className="chip-row" style={{ padding: "0" }}>
                {BUDGET_OPTIONS.map((option) => (
                  <span
                    key={option.key}
                    className={option.key === budget ? "chip active" : "chip"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBudget(option.key);
                    }}
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {visible5 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                5 · Vibe?
              </div>
              <div className="slider-row">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={vibe}
                  onChange={(e) => setVibe(Number(e.target.value))}
                />
                <div className="slider-labels">
                  {VIBE_LABELS.map((label, i) => (
                    <span key={label} className={i === vibe ? "active" : ""}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {visible6 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                6 · Feeling energetic?
              </div>
              <div className="slider-row">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                />
                <div className="slider-labels">
                  {ENERGY_LABELS.map((label, i) => (
                    <span key={label} className={i === energy ? "active" : ""}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {visible7 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                7 · Choose anything you're not in the mood for or move on to Swipe through
                Events!
              </div>
              <div className="checkbox-list">
                {NOT_IN_MOOD.map((option) => (
                  <CheckboxRow
                    key={option}
                    label={option}
                    checked={notInMood.includes(option)}
                    onToggle={() => setNotInMood((prev) => toggleIn(prev, option))}
                  />
                ))}
              </div>
            </>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{error}</p>
          )}

          <button
            className="btn btn-primary"
            style={{ marginTop: "14px" }}
            disabled={!allAnswered || submitting || !planId}
            onClick={handleSwipeThroughEvents}
          >
            {submitting ? "Saving…" : "Swipe through Events!"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ marginTop: "8px" }}
            disabled={!allAnswered || submitting || !planId}
            onClick={handleChooseForMe}
          >
            {submitting ? "Choosing…" : "Choose Events for me"}
          </button>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-faint)",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            {allAnswered ? "Takes about a minute · change anytime" : "Answer all questions to continue"}
          </p>
        </div>
      </div>
    </div>
  );
}
