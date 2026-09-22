import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./authStore";

const STORAGE_KEY = "crew_pending_invite_circle";

// Supabase's inviteUserByEmail link authenticates the user by appending its own token to the
// URL's hash fragment (#access_token=...). This app uses HashRouter, which ALSO lives in the
// hash for routing — a redirectTo of ".../#/join?circle=<id>" would collide with that token
// instead of surviving alongside it. So the invite Edge Function's redirectTo points at a
// plain ".../?circle=<id>" (no hash) instead; this hook stashes that query param on first
// load (before Supabase's client consumes/clears the hash) and, once a session actually
// exists, replays it as a real in-app navigation to /join.
export function usePendingInviteRedirect() {
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();

  useEffect(() => {
    const circleId = new URLSearchParams(window.location.search).get("circle");
    if (circleId) sessionStorage.setItem(STORAGE_KEY, circleId);
  }, []);

  useEffect(() => {
    if (!session) return;
    const circleId = sessionStorage.getItem(STORAGE_KEY);
    if (!circleId) return;
    sessionStorage.removeItem(STORAGE_KEY);
    navigate(`/join?circle=${circleId}`, { replace: true });
  }, [session, navigate]);
}
