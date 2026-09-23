import { useState } from "react";
import { useAuthStore } from "../authStore";
import { advancePlanToConfirmed } from "../lib/planAggregation";
import { formatConcreteDate, nextOccurrence } from "../lib/planDate";
import { supabase } from "../lib/supabase";
import { usePolling } from "../lib/usePolling";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type ChosenIdea = {
  id: string;
  title: string;
  source: "ticketmaster" | "local";
  venue: string | null;
  start_time: string | null;
  city: string | null;
  price_note: string | null;
  vibe: string | null;
  group_size_note: string | null;
};

const CONFIRMED_STATUSES = ["confirmed", "cancelled"];

export function CommitScreen({ onNavigate }: Props) {
  const planId = usePlanStore((s) => s.currentPlanId);
  const user = useAuthStore((s) => s.user);
  const [chosenIdea, setChosenIdea] = useState<ChosenIdea | null>(null);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [chosenTime, setChosenTime] = useState<string | null>(null);
  const [totalActive, setTotalActive] = useState<number | null>(null);
  const [respondedCount, setRespondedCount] = useState<number | null>(null);
  const [myResponse, setMyResponse] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePolling(
    async (isCancelled) => {
      if (!planId || !user) return;

      const { data: plan } = await supabase
        .from("plans")
        .select("circle_id, status, chosen_idea, chosen_day, chosen_time")
        .eq("id", planId)
        .single();
      if (isCancelled() || !plan) return;

      if (CONFIRMED_STATUSES.includes(plan.status)) {
        onNavigate("confirmed");
        return;
      }
      if (plan.status !== "rsvp") return;

      setChosenIdea((plan.chosen_idea as ChosenIdea | null) ?? null);
      setChosenDay(plan.chosen_day ?? null);
      setChosenTime(plan.chosen_time ?? null);

      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", plan.circle_id)
        .eq("status", "active");
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (isCancelled()) return;
      setTotalActive(memberIds.length);

      const { data: rsvps } = await supabase
        .from("plan_rsvps")
        .select("user_id, response")
        .eq("plan_id", planId)
        .in("user_id", memberIds);
      if (isCancelled()) return;
      setRespondedCount((rsvps ?? []).length);
      const mine = (rsvps ?? []).find((r) => r.user_id === user.id);
      if (mine) setMyResponse(mine.response as "yes" | "no");

      if (memberIds.length > 0 && (rsvps ?? []).length === memberIds.length) {
        await advancePlanToConfirmed(planId).catch(() => {});
      }
    },
    5000,
    [planId, user],
  );

  const handleRsvp = async (response: "yes" | "no") => {
    if (!planId || !user) return;
    setSubmitting(true);
    setError(null);

    const { error: rsvpError } = await supabase
      .from("plan_rsvps")
      .upsert({ plan_id: planId, user_id: user.id, response });
    setSubmitting(false);
    if (rsvpError) {
      setError(rsvpError.message);
      return;
    }
    setMyResponse(response);

    try {
      const result = await advancePlanToConfirmed(planId);
      if (result === "confirmed" || result === "already_confirmed") {
        onNavigate("confirmed");
      }
    } catch {
      // Best-effort — the poll above will still catch the plan advancing.
    }
  };

  const concreteDate = formatConcreteDate(nextOccurrence(chosenDay, chosenTime));

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
        <h2 style={{ fontSize: "16px" }}>Can you make it?</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          {!planId && (
            <p style={{ fontSize: 13, color: "var(--warn)" }}>No plan selected.</p>
          )}

          {planId && !chosenIdea && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>
          )}

          {chosenIdea && (
            <>
              <div className="card" style={{ background: "var(--surface-2)" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  {chosenIdea.title}
                </div>
                <div className="meta-row" style={{ marginTop: "4px" }}>
                  {concreteDate && <span>{concreteDate}</span>}
                  {chosenIdea.venue && (
                    <>
                      <span className="dot"></span>
                      <span>{chosenIdea.venue}</span>
                    </>
                  )}
                  {chosenIdea.city && (
                    <>
                      <span className="dot"></span>
                      <span>{chosenIdea.city}</span>
                    </>
                  )}
                </div>
                {(chosenIdea.price_note || chosenIdea.group_size_note || chosenIdea.vibe) && (
                  <div className="meta-row" style={{ marginTop: "4px" }}>
                    {chosenIdea.price_note && <span>{chosenIdea.price_note}</span>}
                    {chosenIdea.group_size_note && (
                      <>
                        <span className="dot"></span>
                        <span>{chosenIdea.group_size_note}</span>
                      </>
                    )}
                    {chosenIdea.vibe && (
                      <>
                        <span className="dot"></span>
                        <span>{chosenIdea.vibe}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="section-label" style={{ padding: "0" }}>
                Your answer
              </div>
              <div className="commit-options">
                <div
                  className={myResponse === "yes" ? "commit-opt sel" : "commit-opt"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!submitting) handleRsvp("yes");
                  }}
                >
                  <span className="radio"></span>
                  <div>
                    <div style={{ fontWeight: "600" }}>I'm in</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Put it on my calendar — I intend to be there.
                    </div>
                  </div>
                </div>
                <div
                  className={myResponse === "no" ? "commit-opt sel" : "commit-opt"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!submitting) handleRsvp("no");
                  }}
                >
                  <span className="radio"></span>
                  <div>
                    <div style={{ fontWeight: "600" }}>I can't make it</div>
                  </div>
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{error}</p>
              )}

              {totalActive !== null && (
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
                  <b style={{ color: "var(--text)" }}>
                    {respondedCount ?? 0} of {totalActive}
                  </b>{" "}
                  friends have responded
                </p>
              )}

              {myResponse && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    marginTop: "14px",
                  }}
                >
                  Your answer is in — waiting on the rest of the group…
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
