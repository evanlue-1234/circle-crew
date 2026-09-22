import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../authStore";
import { useCircleStore } from "../circleStore";
import { PlanStep, resolvePlanStep } from "../lib/planStep";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";
import { ComingSoon } from "./ComingSoon";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Plan = {
  id: string;
  title: string | null;
  event_date: string | null;
};

const ACTIVE_PLAN_STATUSES = ["collecting", "voting", "rsvp"];

type Member = {
  id: string;
  userId: string | null;
  status: string;
  name: string | null;
  email: string | null;
};

const AVATAR_COLORS = ["#e2543a", "#1f7a6b", "#d19900", "#7a4fb0", "#3a8fb0", "#d96a8a"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatEventDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CircleHubScreen({ onNavigate }: Props) {
  const circleId = useCircleStore((s) => s.currentCircleId);
  const user = useAuthStore((s) => s.user);
  const setCurrentPlanId = usePlanStore((s) => s.setCurrentPlanId);
  const [circleName, setCircleName] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);

  const [activePlan, setActivePlan] = useState<{ id: string } | null>(null);
  const [activePlanLoading, setActivePlanLoading] = useState(true);
  const [step, setStep] = useState<PlanStep | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!circleId) return;
    let cancelled = false;
    supabase
      .from("circles")
      .select("name")
      .eq("id", circleId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setCircleName(data.name);
      });
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    let cancelled = false;
    supabase
      .from("plans")
      .select("id, title, event_date")
      .eq("circle_id", circleId)
      .then(({ data }) => {
        if (!cancelled) setPlans(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    let cancelled = false;
    supabase
      .from("circle_members")
      .select("id, user_id, status, email, profiles(name)")
      .eq("circle_id", circleId)
      .in("status", ["active", "invited"])
      .then(({ data }) => {
        if (cancelled) return;
        setMembers(
          (data ?? []).map((row: any) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return {
              id: row.id,
              userId: row.user_id,
              status: row.status,
              name: profile?.name ?? null,
              email: row.email,
            };
          }),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [circleId]);

  useEffect(() => {
    if (!circleId || !user) return;
    let cancelled = false;

    (async () => {
      setActivePlanLoading(true);
      const { data: plan } = await supabase
        .from("plans")
        .select("id, status")
        .eq("circle_id", circleId)
        .in("status", ACTIVE_PLAN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!plan) {
        setActivePlan(null);
        setStep(null);
        setActivePlanLoading(false);
        return;
      }
      setActivePlan(plan);

      const resolved = await resolvePlanStep(plan.id, user.id, plan.status);

      if (!cancelled) {
        setStep(resolved);
        setActivePlanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [circleId, user]);

  const handleStartPlan = async () => {
    if (!circleId || !user) return;
    setCreatingPlan(true);
    setPlanError(null);
    const { data: plan, error } = await supabase
      .from("plans")
      .insert({ circle_id: circleId, status: "collecting", captain_id: user.id })
      .select("id")
      .single();
    setCreatingPlan(false);
    if (error || !plan) {
      setPlanError(error?.message ?? "Couldn't start a plan.");
      return;
    }
    setCurrentPlanId(plan.id);
    onNavigate("poll", "swipe");
  };

  const handleResumePlan = () => {
    if (!activePlan || !step) return;
    setCurrentPlanId(activePlan.id);
    onNavigate(step.screen, step.intent);
  };

  const handleCopyInvite = async () => {
    if (!activePlan) return;
    const url = `${window.location.origin}${window.location.pathname}#/poll?plan=${activePlan.id}`;
    const message = `Help plan our next Crew hangout! Answer a few quick questions and swipe on ideas: ${url}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setPlanError("Couldn't copy — copy the invite link manually.");
    }
  };

  const totalEvents = plans?.length ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dated = (plans ?? []).filter((p): p is Plan & { event_date: string } => !!p.event_date);
  const past = dated
    .filter((p) => new Date(`${p.event_date}T00:00:00`) < today)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));
  const upcoming = dated
    .filter((p) => new Date(`${p.event_date}T00:00:00`) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const lastEvent = past[0];
  const nextEvent = upcoming[0];

  const totalPeople = members?.length ?? 0;
  const eventsJoinedFraction = `0/${totalEvents}`;

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
        <h2 style={{ fontSize: "16px" }}>{circleName ?? "Circle"}</h2>
        <button
          className="ghost-btn"
          aria-label="Invite friends"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("invite");
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div className="card metrics-tile">
            <div className="metric-row">
              <span className="metric-label">Number of Events</span>
              <span className="metric-value">{totalEvents}</span>
            </div>
            <div className="divider-line"></div>
            <div className="metric-row">
              <span className="metric-label">Last Planned Event</span>
              <span className={lastEvent ? "metric-value" : "metric-value placeholder"}>
                {lastEvent ? `${lastEvent.title ?? "Untitled"} · ${formatEventDate(lastEvent.event_date)}` : "—"}
              </span>
            </div>
            <div className="divider-line"></div>
            <div className="metric-row">
              <span className="metric-label">Next Planned Event</span>
              <span className={nextEvent ? "metric-value" : "metric-value placeholder"}>
                {nextEvent
                  ? `${nextEvent.title ?? "Untitled"} · ${formatEventDate(nextEvent.event_date)}`
                  : "No events yet"}
              </span>
            </div>
          </div>

          <div
            className="section-label"
            style={{ padding: "0", marginTop: "12px" }}
          >
            Members · {totalPeople}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {members?.map((member) => {
              const isActive = member.status === "active";
              const label = isActive ? member.name ?? "Member" : member.email ?? "Invited";
              return (
                <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="avatar" style={{ background: colorFor(member.id) }}>
                    {label[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div style={{ flex: "1", fontSize: "13px" }}>{label}</div>
                  <span className={isActive ? "tag tag-soft" : "tag tag-gold"}>
                    {isActive ? "Member" : "Invited"}
                  </span>
                  {isActive && <span className="member-count">{eventsJoinedFraction}</span>}
                </div>
              );
            })}
            {totalPeople === 0 && <div className="empty-state">No members yet.</div>}
          </div>

          <div
            className="section-label"
            style={{ padding: "0", marginTop: "12px" }}
          >
            Favorite Events
          </div>
          <ComingSoon
            compact
            title="Feature coming soon"
            subtitle="Your circle's favorite events will live here."
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                style={{ width: "28px", height: "28px" }}
              >
                <path d="M12 4.5c2-3 7-1.7 7 2.6 0 4.2-5 7.2-7 9.4-2-2.2-7-5.2-7-9.4 0-4.3 5-5.6 7-2.6Z" />
              </svg>
            }
          />

          {planError && (
            <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{planError}</p>
          )}

          {activePlanLoading ? (
            <button className="btn btn-primary" style={{ marginTop: "12px" }} disabled>
              Loading…
            </button>
          ) : !activePlan ? (
            <button
              className="btn btn-primary"
              style={{ marginTop: "12px" }}
              disabled={creatingPlan}
              onClick={(e) => {
                e.stopPropagation();
                handleStartPlan();
              }}
            >
              {creatingPlan ? "Starting…" : "Plan something new"}
            </button>
          ) : step && !step.actionable ? (
            <button className="btn btn-ghost" style={{ marginTop: "12px" }} disabled>
              Event Planning in Progress - Pending Others' Responses
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ marginTop: "12px" }}
              onClick={(e) => {
                e.stopPropagation();
                handleResumePlan();
              }}
            >
              Event Planning in Progress - {step?.label ?? "Add your Idea!"}
            </button>
          )}

          {activePlan && (
            <button
              className={copied ? "btn btn-dark copied" : "btn btn-dark"}
              style={{ marginTop: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyInvite();
              }}
            >
              {copied ? "Copied!" : "Copy invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
