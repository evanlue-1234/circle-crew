import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../authStore";
import { useCircleStore } from "../circleStore";
import { acceptCircleInvite } from "../lib/circleInvites";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Circle = {
  id: string;
  name: string;
  city: string | null;
  memberCount: number;
};

type PendingInvite = {
  circleId: string;
  circleName: string;
};

export function HomeScreen({ onNavigate }: Props) {
  const user = useAuthStore((s) => s.user);
  const setCurrentCircleId = useCircleStore((s) => s.setCurrentCircleId);
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leavingCircle, setLeavingCircle] = useState<Circle | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[] | null>(null);
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!leavingCircle) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLeavingCircle(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [leavingCircle]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Querying `circles` directly would still return circles the user has left, because
      // its RLS select policy also allows `created_by = auth.uid()` (needed so a creator's
      // INSERT...RETURNING succeeds before their circle_members row exists — see schema.sql).
      // Driving this list from the user's own active circle_members rows instead means a
      // circle disappears here the moment they leave, even if they created it.
      const { data: memberships, error: membershipError } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (cancelled) return;
      if (membershipError) {
        setError(membershipError.message);
        return;
      }

      const circleIds = (memberships ?? []).map((m) => m.circle_id);
      if (circleIds.length === 0) {
        setCircles([]);
        return;
      }

      const { data, error } = await supabase
        .from("circles")
        .select("id, name, city, circle_members(status)")
        .in("id", circleIds)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setCircles(
        (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          city: row.city,
          // "Member count" includes people still pending an invite, not just joined ones.
          memberCount: (row.circle_members as { status: string }[]).filter(
            (m) => m.status === "active" || m.status === "invited",
          ).length,
        })),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    supabase
      .from("circle_members")
      .select("circle_id, circles(name)")
      .eq("email", user.email.toLowerCase())
      .eq("status", "invited")
      .then(({ data }) => {
        if (cancelled) return;
        setPendingInvites(
          (data ?? []).map((row: any) => {
            const circle = Array.isArray(row.circles) ? row.circles[0] : row.circles;
            return { circleId: row.circle_id, circleName: circle?.name ?? "Circle" };
          }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleJoinInvite = async (invite: PendingInvite) => {
    setJoiningCircleId(invite.circleId);
    setJoinError(null);
    try {
      await acceptCircleInvite(invite.circleId);
      setPendingInvites((prev) => (prev ?? []).filter((i) => i.circleId !== invite.circleId));
      openCircle(invite.circleId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : String(err));
    } finally {
      setJoiningCircleId(null);
    }
  };

  const openCircle = (id: string) => {
    setCurrentCircleId(id);
    onNavigate("circleHub");
  };

  const handleLeave = async () => {
    if (!leavingCircle || !user) return;
    setLeaving(true);
    setLeaveError(null);

    const { error: deleteError } = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", leavingCircle.id)
      .eq("user_id", user.id);

    setLeaving(false);
    if (deleteError) {
      setLeaveError(deleteError.message);
      return;
    }

    setCircles((prev) => (prev ?? []).filter((c) => c.id !== leavingCircle.id));
    setToast(`You left ${leavingCircle.name}.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
    setLeavingCircle(null);
  };

  const userInitial = (user?.user_metadata?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="app-header">
        <h2>Your circles</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            className="ghost-btn"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("setup");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            className="ghost-btn"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "var(--primary)",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "13px",
              padding: "0",
              display: "grid",
              placeItems: "center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("profile");
            }}
          >
            {userInitial}
          </button>
        </div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          {pendingInvites && pendingInvites.length > 0 && (
            <>
              <div className="section-label" style={{ padding: "0" }}>
                Pending Invites
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.circleId}
                    className="card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div className="card-title">{invite.circleName}</div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: "auto", padding: "0 16px" }}
                      disabled={joiningCircleId === invite.circleId}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinInvite(invite);
                      }}
                    >
                      {joiningCircleId === invite.circleId ? "Joining…" : "Join"}
                    </button>
                  </div>
                ))}
              </div>
              {joinError && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 10 }}>{joinError}</p>
              )}
            </>
          )}

          {error && (
            <p style={{ fontSize: 13, color: "var(--warn)" }}>Couldn't load circles: {error}</p>
          )}

          {!error && circles === null && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading your circles…</p>
          )}

          {!error && circles !== null && circles.length === 0 && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="card-title">No circles yet</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Create a circle to start planning with your friends, coworkers, or family.
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => onNavigate("setup")}
              >
                Create a circle
              </button>
            </div>
          )}

          {circles?.map((circle) => (
            <div
              key={circle.id}
              className="card"
              onClick={(e) => {
                e.stopPropagation();
                openCircle(circle.id);
              }}
            >
              <button
                type="button"
                className="card-leave-btn"
                aria-label={`Leave ${circle.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLeaveError(null);
                  setLeavingCircle(circle);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="card-title">{circle.name}</div>
                  <div className="card-sub">
                    {circle.memberCount} member{circle.memberCount === 1 ? "" : "s"}
                    {circle.city ? ` · ${circle.city}` : ""}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "12px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  openCircle(circle.id);
                }}
              >
                View circle
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {leavingCircle && (
        <div className="modal-backdrop" onClick={() => setLeavingCircle(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Are you sure you want to leave the Circle?</div>
            {leaveError && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 10 }}>{leaveError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={leaving}
                onClick={handleLeave}
              >
                {leaving ? "Leaving…" : "Leave the Circle"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={leaving}
                onClick={() => setLeavingCircle(null)}
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
