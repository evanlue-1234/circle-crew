import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { acceptCircleInvite } from "../lib/circleInvites";
import { supabase } from "../lib/supabase";
import { useCircleStore } from "../circleStore";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function JoinScreen({ onNavigate }: Props) {
  const [searchParams] = useSearchParams();
  const circleId = searchParams.get("circle");
  const setCurrentCircleId = useCircleStore((s) => s.setCurrentCircleId);

  const [circleName, setCircleName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) return;
    let cancelled = false;

    supabase
      .from("circles")
      .select("name")
      .eq("id", circleId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError("You haven't been invited to this circle.");
          return;
        }
        setCircleName(data.name);
      });

    return () => {
      cancelled = true;
    };
  }, [circleId]);

  const handleJoin = async () => {
    if (!circleId) return;
    setJoining(true);
    setJoinError(null);

    try {
      const result = await acceptCircleInvite(circleId);
      if (result === "not_invited") {
        setJoinError("You haven't been invited to this circle.");
        return;
      }
      setCurrentCircleId(circleId);
      onNavigate("circleHub");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="app-header">
        <h2 style={{ fontSize: "16px" }}>Join circle</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ textAlign: "center", paddingTop: "30px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
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
              style={{ width: "30px", height: "30px" }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          {!circleId && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 16 }}>
              This invite link is missing a circle.
            </p>
          )}

          {circleId && loadError && (
            <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 16 }}>{loadError}</p>
          )}

          {circleId && !loadError && !circleName && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16 }}>Loading…</p>
          )}

          {circleId && circleName && (
            <>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "700",
                  fontSize: "19px",
                  marginTop: "16px",
                }}
              >
                You've been invited to join {circleName}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Join to start planning hangouts together.
              </p>

              {joinError && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{joinError}</p>
              )}

              <button
                className="btn btn-primary"
                style={{ marginTop: "16px" }}
                disabled={joining}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoin();
                }}
              >
                {joining ? "Joining…" : "Join Circle"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
