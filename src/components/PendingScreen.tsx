import { useEffect, useState } from "react";
import { advancePlanToVoting } from "../lib/planAggregation";
import { hasUserCompletedPlan } from "../lib/planCompletion";
import { supabase } from "../lib/supabase";
import { usePolling } from "../lib/usePolling";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const POLL_INTERVAL_MS = 5000;

export function PendingScreen({ onNavigate }: Props) {
  const planId = usePlanStore((s) => s.currentPlanId);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    supabase
      .from("plans")
      .select("circle_id")
      .eq("id", planId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setCircleId(data?.circle_id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  usePolling(
    async (isCancelled) => {
      if (!planId || !circleId) return;

      const { data: plan } = await supabase.from("plans").select("status").eq("id", planId).single();
      if (isCancelled()) return;
      if (plan && plan.status !== "collecting") {
        // Someone's client already advanced it (or is about to) — head to Vote rather than
        // keep polling. Anything past 'collecting' means voting has started.
        onNavigate("vote");
        return;
      }

      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circleId)
        .eq("status", "active");
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (isCancelled()) return;
      setTotalMembers(memberIds.length);

      const results = await Promise.all(memberIds.map((id) => hasUserCompletedPlan(planId, id)));
      if (isCancelled()) return;
      const done = results.filter(Boolean).length;
      setDoneCount(done);

      // Safety net: whichever client's poll notices everyone's done — not just the member
      // whose own completion happened to be the last one — can trigger the advance. Safe to
      // call redundantly since advance_plan_to_voting re-verifies and is a no-op once the
      // plan is no longer 'collecting'.
      if (done === memberIds.length && memberIds.length > 0) {
        await advancePlanToVoting(planId).catch(() => {});
      }
    },
    POLL_INTERVAL_MS,
    [planId, circleId],
  );

  const progressPct = totalMembers ? Math.round(((doneCount ?? 0) / totalMembers) * 100) : 0;

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
        <h2 style={{ fontSize: "16px" }}>Pending</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center", paddingTop: "22px" }}>
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              style={{ width: "28px", height: "28px" }}
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "19px",
              marginTop: "14px",
            }}
          >
            Answers are submitted!
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            Pending others' responses…
          </p>

          {!planId && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 12 }}>No plan selected.</p>
          )}

          {planId && totalMembers === null && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Checking in…</p>
          )}

          {planId && totalMembers !== null && (
            <>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
                <b style={{ color: "var(--text)" }}>
                  {doneCount ?? 0} of {totalMembers}
                </b>{" "}
                friends have responded
              </p>
              <div className="progress" style={{ marginTop: "10px" }}>
                <span style={{ width: `${progressPct}%` }}></span>
              </div>
            </>
          )}

          <button
            className="btn btn-ghost"
            style={{ marginTop: "20px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("circleHub");
            }}
          >
            Back to circle
          </button>
        </div>
      </div>
    </div>
  );
}
