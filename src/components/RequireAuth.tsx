import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../authStore";

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return null;
  if (!session) {
    // Remembers where the user was headed (e.g. /join?circle=<id>) so Login/Signup can send
    // them back here instead of always landing on Home.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <>{children}</>;
}
