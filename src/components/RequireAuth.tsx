import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../authStore";

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
