import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { ScreenId } from "./navigation";
import { screens } from "./screens";

const publicScreenIds: ScreenId[] = ["login", "signup"];
const screenIds = Object.keys(screens) as ScreenId[];
const protectedScreenIds = screenIds.filter((id) => !publicScreenIds.includes(id));

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        {publicScreenIds.map((id) => (
          <Route key={id} path={`/${id}`} element={<AppShell screen={id} />} />
        ))}
        {protectedScreenIds.map((id) => (
          <Route
            key={id}
            path={`/${id}`}
            element={
              <RequireAuth>
                <AppShell screen={id} />
              </RequireAuth>
            }
          />
        ))}
      </Routes>
    </HashRouter>
  );
}
