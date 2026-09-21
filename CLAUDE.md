# CLAUDE.md — project context for Claude Code

## What this project is
**Crew** is a private social-planning companion for existing friend groups. Core loop:
create circle → rotate a "Plan Captain" → poll group preferences → swipe ideas → match →
vote → commit → confirm → recap → remember → plan again. MVP is scoped to Raleigh–Durham.

## Current state
This is a **clickable prototype**, not a production app yet. All 22 screens are real React
components routed with `react-router-dom` (see Architecture below), but there is still **no
backend, no auth, no data persistence** — all content (circles, plans, discover feed,
memories) is hardcoded JSX. The job ahead is a Supabase backend, then wrap with Capacitor for
iOS/Android — see Roadmap below.

## Stack
- React 18 + Vite 5 + TypeScript 5
- `react-router-dom` (HashRouter — chosen so the eventual Capacitor-wrapped app and any static
  host work with zero server-side rewrite rules) + `zustand` for the one piece of cross-screen
  state (`PlanIntent`)
- Fonts: Cabinet Grotesk (display) + General Sans (body), loaded from Fontshare CDN in `index.html`
- No CSS framework — design tokens are plain CSS custom properties in `src/styles/app.css`

## Commands
```bash
npm install      # install deps
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build  -> output in dist/
npm run preview  # serve the production build
```

## Architecture
```
src/
  main.tsx             React entry, mounts <App>
  App.tsx              HashRouter + one <Route> per ScreenId, all rendering <AppShell>
  useAppNavigate.ts    hook: onNavigate(target, intent?) → resolves "back"/"afterPoll" → navigate()
  store.ts             Zustand store holding the current PlanIntent
  navigation.ts        ScreenId (22 values), PlanIntent type, afterPoll map
  screens.tsx          Record<ScreenId, Component> — maps each ScreenId to its component
  components/
    AppShell.tsx       phone frame (desktop) / full-viewport (mobile) + dark-mode toggle;
                        looks up the current screen's component and hands it useAppNavigate()
    StatusBar.tsx       shared fake status bar (time + signal/wifi/battery), used by every screen
    <Name>Screen.tsx    one component per screen (LoginScreen, HomeScreen, SwipeScreen, ...)
  styles/
    app.css            design tokens + component CSS + app-shell overrides
```
Each screen component takes a single `onNavigate(target, intent?)` prop and calls it directly
from its own JSX event handlers (no more `data-nav` DOM delegation — that pattern only existed
because screens used to be `dangerouslySetInnerHTML` strings). Elements nested inside another
clickable element (e.g. a button inside a clickable card) call `e.stopPropagation()` in their
handler so only the innermost target navigates.

### How navigation works
- Screens call `onNavigate("<screen>")` — implemented by `useAppNavigate()` — to move between
  routes (`/login`, `/home`, `/circleHub`, ...).
- Some pass an intent too — `onNavigate("poll", "swipe")` (e.g. choosing a planning method on
  the Captain screen stores the intent in the Zustand store, which decides where the Poll
  screen goes next).
- The Poll screen's "Next question" / "Skip" call `onNavigate("afterPoll")`, resolved via the
  stored intent — see `afterPoll` in `navigation.ts`.
- Back buttons call `onNavigate("back")`, which calls the router's `navigate(-1)` (native
  browser history).

## The 22 screens (ScreenId)
1 login · 2 signup · 3 home · 4 circleHub · 5 plans · 6 setup · 7 invite · 8 spinner ·
9 captain · 10 discover · 11 poll · 12 swipe · 13 share · 14 pending · 15 match · 16 vote ·
17 commit · 18 confirmed · 19 rhythm · 20 recap · 21 memories · 22 profile

## Design system (preserve these)
- Coral primary `#e2543a` / `var(--primary)`, teal `#1f7a6b`, gold `#d19900`, warm cream surfaces.
- Dark mode via `[data-theme="dark"]` on `<html>`.
- Phone frames are 320×740px on desktop; full viewport (100dvh, no bezel) at ≤640px.

## Conventions to follow
- **Mobile-first.** Build for the phone, then let desktop show the framed view.
- **Preserve the design tokens.** Use the CSS variables in `app.css`, don't hardcode colors.
- Keep the existing markup/class names when adding real state/data to a screen, so the
  existing CSS in `app.css` keeps covering it.
- A fake-input-styled `<div>` (border/radius/padding mimicking a text field) should become a
  real `<input>`/`<textarea>` using the `.field-label`/`.field-input` classes (see
  `LoginScreen.tsx`, `SignupScreen.tsx`, `SetupScreen.tsx`) rather than staying static.
- Use relative asset paths (Vite `base: "./"` is already set in `vite.config.ts`).

## Feature scope (confirmed)
- **Cross-group visibility:** anonymized trends only — e.g. "12 groups did X this week." No
  group identity, membership, or plan details are ever exposed across circles.
- **Places/events data:** Google Places API (venues, deferred/non-MVP) + Ticketmaster
  Discovery API (ticketed events, live — powers the swipe deck via a Supabase Edge Function).
  Eventbrite was the original plan but its public location-search API is deprecated for
  standard keys; see `TICKETMASTER.md` and the correction note in `APIS.md`.
- **City scope:** single city (Raleigh–Durham) for the MVP; multi-city is a later expansion.
- **Calendar export:** in scope — add a confirmed plan to the user's calendar, starting with
  `.ics` file generation (no auth/integration dependency).
- **Explicitly out of scope for now:** push notifications, expense/bill-splitting,
  monetization (ads/premium/affiliate).

Full rationale: `/Users/apple/.claude/plans/i-want-to-summarize-mighty-flame.md`.

## Intended next steps (roadmap)
1. ~~Componentize the 22 screens into real React components.~~ **Done.**
2. ~~Add routing with `react-router-dom` and light global state (Zustand).~~ **Done.**
3. Add Supabase: `@supabase/supabase-js`, env vars `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_PUBLISHABLE_KEY` (the publishable key, `sb_publishable_...` — Supabase renamed
   the old "anon" key), auth (`signUp`, `signInWithPassword`, `onAuthStateChange`), and database
   tables with RLS. See `SUPABASE.md` for the full setup + schema.
4. Build the real features: Google Places + Eventbrite/Ticketmaster data layer for
   Discover/Swipe, anonymized cross-group trends, `.ics` calendar export, add contacts to a
   circle, forgot-password flow, multi-event swipe.
5. Capacitor wrap: `@capacitor/core`, `@capacitor/cli`, `npx cap init`, then `@capacitor/ios`
   and `@capacitor/android`, `npx cap sync`, open in Xcode / Android Studio.
