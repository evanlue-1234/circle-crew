import { useEffect, useState } from "react";
import { useAuthStore } from "../authStore";
import { fetchPollAnswers, Idea, loadDeckForPlan, SELECT_TARGET } from "../lib/ideaDeck";
import { advancePlanToVoting } from "../lib/planAggregation";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const FALLBACK_GRADIENT = "linear-gradient(135deg,#7a3b2e,#d9956a)";
const LOCAL_FALLBACK_GRADIENT = "linear-gradient(135deg,#1f7a6b,#3a8fb0)";

function formatWhen(startTime: string | null) {
  if (!startTime) return null;
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SwipeScreen({ onNavigate }: Props) {
  const planId = usePlanStore((s) => s.currentPlanId);
  const user = useAuthStore((s) => s.user);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city")
          .eq("id", user!.id)
          .single();
        const userCity = profile?.city ?? null;

        // The durable source of truth for this user's answers, not the ephemeral Zustand
        // copy — so resuming this plan in a fresh session (or via Circle Hub's "Add your
        // Idea!") still filters correctly instead of showing an unfiltered deck.
        const answers = await fetchPollAnswers(planId, user!.id);
        const deck = await loadDeckForPlan({ planId, userId: user!.id, userCity, answers });

        if (!cancelled) {
          setIdeas(deck);
          setIndex(0);
          setSelectedCount(0);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planId, user]);

  const current = ideas?.[index];
  const deckExhausted = ideas !== null && !current;
  const notEnoughMatches =
    (ideas !== null && ideas.length < SELECT_TARGET) || (deckExhausted && selectedCount < SELECT_TARGET);

  const handlePass = async () => {
    if (!current || !user) return;
    await supabase.from("swipes").upsert({ idea_id: current.id, user_id: user.id, direction: "dislike" });
    setIndex((i) => i + 1);
  };

  const handleSelect = async () => {
    if (!current || !user || !planId) return;
    await supabase.from("swipes").upsert({ idea_id: current.id, user_id: user.id, direction: "like" });
    const nextCount = selectedCount + 1;
    setSelectedCount(nextCount);
    if (nextCount >= SELECT_TARGET) {
      // Best-effort: if this fails, PendingScreen's own poll (or another member's
      // completion) will still catch the group being done and advance the plan.
      advancePlanToVoting(planId).catch(() => {});
      onNavigate("pending");
      return;
    }
    setIndex((i) => i + 1);
  };

  const localMeta = current?.local
    ? [current.local.city, current.local.price_note, current.local.vibe, current.local.group_size_note]
        .filter(Boolean)
        .join(" · ")
    : null;

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
            <path d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-muted)",
          }}
        >
          {ideas ? `${selectedCount} / ${SELECT_TARGET} selected` : "Loading…"}
        </div>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          {error && <p style={{ fontSize: 13, color: "var(--warn)" }}>{error}</p>}

          {!error && !planId && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              No plan selected — start one from a circle, or open an invite link.
            </p>
          )}

          {!error && planId && ideas === null && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Finding local ideas…</p>
          )}

          {!error && notEnoughMatches && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="card-title">Not enough matches</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Not enough matches for your filters — try broadening your answers.
              </p>
            </div>
          )}

          {!error && !notEnoughMatches && current && (
            <>
              <div style={{ position: "relative" }}>
                <div
                  className="photo tall"
                  style={{
                    backgroundImage: current.image_url
                      ? `url(${current.image_url})`
                      : current.source === "local"
                        ? LOCAL_FALLBACK_GRADIENT
                        : FALLBACK_GRADIENT,
                  }}
                >
                  <div className="photo-grad"></div>
                  {current.source === "local" && (
                    <div className="photo-price">
                      <span className="tag tag-teal">Local pick</span>
                    </div>
                  )}
                  <div className="photo-label">
                    <div className="pl-t">{current.title}</div>
                    <div className="pl-s">
                      {current.source === "local"
                        ? localMeta || "Local activity"
                        : [current.venue, formatWhen(current.start_time)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="swipe-actions">
                <button className="swipe-btn no" onClick={handlePass}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
                <button className="swipe-btn yes" onClick={handleSelect}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </button>
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--text-faint)",
                  marginTop: "10px",
                }}
              >
                Pass · Select
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
