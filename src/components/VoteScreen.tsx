import { useState } from "react";
import { useAuthStore } from "../authStore";
import { advancePlanToRsvp, advancePlanToVoting } from "../lib/planAggregation";
import { supabase } from "../lib/supabase";
import { usePolling } from "../lib/usePolling";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type VotingIdea = {
  id: string;
  title: string;
  source: "ticketmaster" | "local";
  venue: string | null;
  start_time: string | null;
  url: string | null;
  image_url: string | null;
  votes: number;
};

const ADVANCED_STATUSES = ["rsvp", "confirmed", "cancelled"];

export function VoteScreen({ onNavigate }: Props) {
  const planId = usePlanStore((s) => s.currentPlanId);
  const user = useAuthStore((s) => s.user);
  const [votingIdeas, setVotingIdeas] = useState<VotingIdea[] | null>(null);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [bestTime, setBestTime] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePolling(
    async (isCancelled) => {
      if (!planId || !user) return;

      const { data: plan } = await supabase
        .from("plans")
        .select("status, voting_ideas, best_day, best_time")
        .eq("id", planId)
        .single();
      if (isCancelled() || !plan) return;

      if (ADVANCED_STATUSES.includes(plan.status)) {
        onNavigate("commit");
        return;
      }

      const ideas = (plan.voting_ideas as VotingIdea[] | null) ?? [];
      setVotingIdeas(ideas);
      setBestDay(plan.best_day ?? null);
      setBestTime(plan.best_time ?? null);

      // Self-heal: a plan can be stuck at status='voting' with no candidates if it advanced
      // under an earlier version of advance_plan_to_voting before that function computed
      // voting_ideas correctly. Re-calling it is safe — it only recomputes when voting_ideas
      // is actually missing (migration 0014), otherwise it's a no-op.
      if (plan.status === "voting" && ideas.length === 0) {
        advancePlanToVoting(planId).catch(() => {});
      }

      const { data: myVote } = await supabase
        .from("votes")
        .select("idea_id")
        .eq("plan_id", planId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (isCancelled()) return;
      if (myVote) {
        setSelectedIdeaId(myVote.idea_id);
        setHasVoted(true);
      }
    },
    5000,
    [planId, user],
  );

  const handleSubmitVote = async () => {
    if (!planId || !user || !selectedIdeaId) return;
    setSubmitting(true);
    setError(null);

    const { error: voteError } = await supabase
      .from("votes")
      .upsert({ plan_id: planId, user_id: user.id, idea_id: selectedIdeaId });
    setSubmitting(false);
    if (voteError) {
      setError(voteError.message);
      return;
    }
    setHasVoted(true);

    try {
      // 'already_rsvp' means another member's vote already tipped it — treat it the same as
      // our own vote tipping it, since either way the plan has moved on and there's nothing
      // wrong to report.
      const result = await advancePlanToRsvp(planId);
      if (result === "rsvp" || result === "already_rsvp") {
        onNavigate("commit");
      }
    } catch {
      // Best-effort — the poll above will still catch the plan advancing.
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
        <h2 style={{ fontSize: "16px" }}>Final vote</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "19px",
              letterSpacing: "-0.01em",
            }}
          >
            Which one should we do?
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Pick your favorite. We'll confirm the option with the most votes.
          </p>

          {!planId && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 12 }}>No plan selected.</p>
          )}

          {planId && votingIdeas === null && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
              Loading candidates…
            </p>
          )}

          {planId && votingIdeas !== null && votingIdeas.length === 0 && (
            <div className="card" style={{ textAlign: "center", marginTop: 12 }}>
              <div className="card-title">No candidates yet</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Waiting on the group to finish picking ideas.
              </p>
            </div>
          )}

          {votingIdeas && votingIdeas.length > 0 && (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "14px" }}>
                Proposed date
              </div>
              <div className="why-box">
                {bestDay ?? "Any day"} · {bestTime ?? "Any time"}
              </div>

              <div className="vote-split" style={{ marginTop: "14px" }}>
                {votingIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className={idea.id === selectedIdeaId ? "vote-opt sel" : "vote-opt"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasVoted) setSelectedIdeaId(idea.id);
                    }}
                  >
                    <div className="vo-emoji">{idea.source === "local" ? "📍" : "🎟️"}</div>
                    <div className="vo-name">{idea.title}</div>
                  </div>
                ))}
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{error}</p>
              )}

              {!hasVoted ? (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "14px" }}
                  disabled={!selectedIdeaId || submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmitVote();
                  }}
                >
                  {submitting ? "Submitting…" : "Submit my vote"}
                </button>
              ) : (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    marginTop: "14px",
                  }}
                >
                  Your vote is in — waiting on the rest of the group…
                </p>
              )}
            </>
          )}

          <button
            className="btn btn-ghost"
            style={{ marginTop: "14px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("discover");
            }}
          >
            Back to Discover
          </button>
        </div>
      </div>
    </div>
  );
}
