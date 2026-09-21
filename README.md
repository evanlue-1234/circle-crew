# Crew — Starter App

A clickable, navigable prototype built from the Crew mockups. React + Vite + TypeScript.

The 22 mockup screens are real React components (preserving the original design), wired
through `react-router-dom` with a small Zustand store for cross-screen state.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build / preview

```bash
npm run build
npm run preview
```

## How it's structured

```
src/
  main.tsx              entry
  App.tsx               HashRouter + one <Route> per screen, all rendering <AppShell>
  useAppNavigate.ts     onNavigate(target, intent?) hook used by every screen
  store.ts              Zustand store holding the current PlanIntent
  navigation.ts         ScreenId + PlanIntent types, afterPoll map
  screens.tsx           Record<ScreenId, Component> mapping each screen to its component
  components/
    AppShell.tsx         phone frame + dark-mode toggle
    StatusBar.tsx         shared fake status bar used by every screen
    <Name>Screen.tsx      one component per screen (LoginScreen, HomeScreen, ...)
  styles/app.css        design tokens + component CSS (from the mockups) + app shell
```

### Navigation

Each screen calls `onNavigate("<screen>")` directly from its own click handlers to move
between routes. Some also pass an intent — `onNavigate("poll", "swipe")` (e.g. choosing a
planning method on the Captain screen stores the intent in Zustand, which decides where the
Poll screen goes next).

The Poll screen's "Next question" / "Skip" call `onNavigate("afterPoll")`, which
`useAppNavigate` resolves via the stored intent — see `afterPoll` in `navigation.ts`.

Back buttons call `onNavigate("back")`, which calls the router's native `navigate(-1)`.

Routing uses `HashRouter` (URLs like `/#/home`) rather than `BrowserRouter` so the built app
works from a plain static host or inside the eventual Capacitor webview without any
server-side SPA rewrite rule.

### Editing screens

Each screen is a real component in `src/components/` (e.g. `src/components/HomeScreen.tsx`).
Edit its JSX directly — the design system CSS in `src/styles/app.css` already covers the
existing class names. A fake-input-styled `<div>` should become a real `<input>`/`<textarea>`
using the `.field-label`/`.field-input` classes (see `LoginScreen.tsx` for the pattern).

## Going to the app stores

This is a web app structured for a future Capacitor wrap — it is **not** app-store
ready yet. See `MOBILE.md` for the next steps.
