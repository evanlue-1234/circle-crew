import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { NdaGate } from "./components/NdaGate";
import { RequireAuth } from "./components/RequireAuth";
import { useAuthStore } from "./authStore";
import { ScreenId } from "./navigation";
import { screens } from "./screens";
import { usePendingInviteRedirect } from "./usePendingInviteRedirect";

const publicScreenIds: ScreenId[] = [
  "splash",
  "login",
  "onboardingWelcome",
  "onboardingName",
  "onboardingLocation",
  "onboardingAccount",
];
const screenIds = Object.keys(screens) as ScreenId[];
const protectedScreenIds = screenIds.filter((id) => !publicScreenIds.includes(id));

function RootRedirect() {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return null;
  return <Navigate to={session ? "/home" : "/splash"} replace />;
}

function AppRoutes() {
  usePendingInviteRedirect();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      {publicScreenIds.map((id) => (
        <Route key={id} path={`/${id}`} element={<AppShell screen={id} />} />
      ))}
      {protectedScreenIds.map((id) => (
        <Route
          key={id}
          path={`/${id}`}
          element={
            <RequireAuth>
              {id === "home" ? (
                <NdaGate>
                  <AppShell screen={id} />
                </NdaGate>
              ) : (
                <AppShell screen={id} />
              )}
            </RequireAuth>
          }
        />
      ))}
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
