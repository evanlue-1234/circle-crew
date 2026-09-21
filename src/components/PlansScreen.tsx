import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../authStore";
import { cancelPlan } from "../lib/planAggregation";
import { formatConcreteDate, nextOccurrence } from "../lib/planDate";
import { PlanStep, resolvePlanStep } from "../lib/planStep";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type ChosenIdea = {
  title: string;
  venue: string | null;
  city: string | null;
};

type PlanRow = {
  id: string;
  circle_id: string;
  status: string;
  captain_id: string | null;
  chosen_idea: ChosenIdea | null;
  chosen_day: string | null;
  chosen_time: string | null;
  circles: { name: string } | { name: string }[] | null;
};

const STATUS_LABEL: Record<string, string> = {
  collecting: "Gathering ideas",
  voting: "Voting",
  rsvp: "RSVP",
};

const STATUS_TAG_CLASS: Record<string, string> = {
  collecting: "tag tag-soft",
  voting: "tag tag-gold",
  rsvp: "tag tag-warn",
};

function circleName(row: PlanRow): string {
  const circle = Array.isArray(row.circles) ? row.circles[0] : row.circles;
  return circle?.name ?? "Circle";
}

export function PlansScreen({ onNavigate }: Props) {
  const user = useAuthStore((s) => s.user);
  const setCurrentPlanId = usePlanStore((s) => s.setCurrentPlanId);
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, PlanStep>>({});
  const [removeTarget, setRemoveTarget] = useState<PlanRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("plans")
        .select("id, circle_id, status, captain_id, chosen_idea, chosen_day, chosen_time, circles(name)")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setPlans([]);
        return;
      }
      setPlans((data ?? []) as unknown as PlanRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const upcoming = useMemo(() => {
    const rows = (plans ?? []).filter((p) => p.status === "confirmed");
    return rows
      .map((row) => ({ row, date: nextOccurrence(row.chosen_day, row.chosen_time) }))
      .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  }, [plans]);

  const drafts = useMemo(
    () => (plans ?? []).filter((p) => p.status === "collecting" && p.captain_id === user?.id),
    [plans, user],
  );

  const pending = useMemo(
    () =>
      (plans ?? []).filter(
        (p) => p.status === "voting" || p.status === "rsvp" || (p.status === "collecting" && p.captain_id !== user?.id),
      ),
    [plans, user],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        pending.map(async (p) => [p.id, await resolvePlanStep(p.id, user.id, p.status)] as const),
      );
      if (!cancelled) setSteps(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
    // pending is derived from `plans`, so keying on plans (not the freshly-filtered array
    // reference) avoids re-resolving every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, plans]);

  const openConfirmed = (plan: PlanRow) => {
    setCurrentPlanId(plan.id);
    onNavigate("confirmed");
  };

  const openPending = (plan: PlanRow) => {
    const step = steps[plan.id];
    if (!step) return;
    setCurrentPlanId(plan.id);
    onNavigate(step.screen, step.intent);
  };

  const handleRemovePlan = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);

    try {
      const result = await cancelPlan(removeTarget.id);
      if (result !== "cancelled" && result !== "already_cancelled") {
        setRemoveError("Couldn't remove this plan.");
        return;
      }
      setPlans((prev) => (prev ?? []).filter((p) => p.id !== removeTarget.id));
      setToast("Plan removed.");
      setRemoveTarget(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemoving(false);
    }
  };

  const totalActive = upcoming.length + pending.length + drafts.length;

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="app-header">
        <h2>Plans</h2>
        {plans !== null && <span className="tag tag-soft">{totalActive} active</span>}
      </div>
      <div className="screen-body">
        <div className="content-pad">
          {error && <p style={{ fontSize: 13, color: "var(--warn)" }}>Couldn't load plans: {error}</p>}

          {!error && plans === null && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading your plans…</p>
          )}

          {!error && plans !== null && (
            <>
              <div className="section-label" style={{ padding: "0" }}>
                Upcoming
              </div>
              {upcoming.length === 0 && <div className="empty-state">No confirmed plans yet</div>}
              {upcoming.map(({ row, date }) => (
                <div
                  key={row.id}
                  className="card"
                  style={{ marginBottom: "10px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfirmed(row);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="card-title">{row.chosen_idea?.title ?? "Untitled event"}</div>
                      <div className="meta-row" style={{ marginTop: "2px" }}>
                        <span>{circleName(row)}</span>
                        {date && (
                          <>
                            <span className="dot"></span>
                            <span>{formatConcreteDate(date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="tag tag-success">Confirmed</span>
                  </div>
                </div>
              ))}

              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                Pending
              </div>
              {pending.length === 0 && <div className="empty-state">You're all caught up</div>}
              {pending.map((row) => {
                const step = steps[row.id];
                return (
                  <div
                    key={row.id}
                    className="card"
                    style={{ marginBottom: "10px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPending(row);
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="card-title">{circleName(row)}</div>
                        <div className="meta-row" style={{ marginTop: "2px" }}>
                          <span>{step ? step.label : "Loading…"}</span>
                        </div>
                      </div>
                      <span className={STATUS_TAG_CLASS[row.status] ?? "tag tag-soft"}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </div>
                    {row.captain_id === user?.id && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: "8px", width: "auto" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveError(null);
                          setRemoveTarget(row);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                Drafts
              </div>
              {drafts.length === 0 && <div className="empty-state">No drafts</div>}
              {drafts.map((row) => (
                <div key={row.id} className="card" style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="card-title">{circleName(row)}</div>
                      <div className="meta-row" style={{ marginTop: "2px" }}>
                        <span className="tag tag-soft">Draft</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveError(null);
                        setRemoveTarget(row);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {removeTarget && (
        <div className="modal-backdrop" onClick={() => !removing && setRemoveTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Remove this plan?</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              This cancels the plan for everyone in {circleName(removeTarget)}.
            </p>
            {removeError && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{removeError}</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" disabled={removing} onClick={handleRemovePlan}>
                {removing ? "Removing…" : "Remove plan"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={removing}
                onClick={() => setRemoveTarget(null)}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
