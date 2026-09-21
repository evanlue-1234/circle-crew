# Crew — From Prototype to Real App

*A teacher-style walkthrough for moving the Crew starter app into Visual Studio Code and
taking it through the rest of the build. Read this top to bottom the first time; after that
you can jump to the part you need.*

---

## 0. Where you are right now (the map)

You have a **clickable prototype**, not a finished product. That is an important distinction
in software, so let's make it precise.

Think of what you have as a **movie set**: it looks like a real app, the screens are
beautiful, and you can walk from one room to the next — but the walls are flat. There is no
plumbing behind the faucets. Concretely:

- The 22 screens are stored as **HTML strings** in `src/screens.json`.
- A component called `StaticScreen.tsx` injects each string onto the page with
  `dangerouslySetInnerHTML` (a React escape hatch that says "trust this HTML").
- A tiny route state machine in `App.tsx` decides which screen to show, and a `data-nav`
  attribute on each button tells the app where to go next.

This was the right way to preserve your mockup design fast. But it has a **ceiling**: there
is no real state, no database, no login, no persistence. Tapping "Log in" just changes which
screen you see. It doesn't check a password because there are no passwords.

The rest of this guide is about turning the movie set into a real building — and doing it in
**Visual Studio Code with Claude Code** as your pair programmer.

> **Key idea:** A real app = UI (you have this) + state (data that changes) + backend (where
> data lives and who is allowed to see it) + a way to ship it to phones (Capacitor).

---

## Part 1 — Set up your workshop (VS Code)

### 1.1 Install Node.js
Crew runs on **Node.js**. Install the LTS (long-term support) version from
[nodejs.org](https://nodejs.org). The LTS is the "stable, well-tested" version — always
choose LTS for real projects. Verify it works by opening a terminal and typing:

```bash
node --version    # something like v20.x.x
npm --version     # something like 10.x.x
```

`npm` is the package manager that comes with Node — it's how you install the libraries the
app depends on.

### 1.2 Unzip the project
Take the `crew-starter.zip` you downloaded and unzip it into a real project folder, e.g.

- **macOS:** `~/projects/crew`
- **Windows:** `C:\projects\crew`

Avoid unzipping it into a cloud-synced folder (OneDrive/Dropbox) — those can corrupt
`node_modules`. Use a plain local folder.

### 1.3 Open it in VS Code
Open VS Code, then **File → Open Folder** and select the `crew-starter` folder (the one
containing `package.json`). Open the integrated terminal with **Ctrl + `** (backtick) or
**View → Terminal**. Your editor is now "rooted" at the project.

### 1.4 Install dependencies
In the terminal:

```bash
npm install
```

This reads `package.json`, downloads every library the app needs, and puts them in a
`node_modules` folder. (You'll add `node_modules` to `.gitignore` later — it should never be
committed.)

### 1.5 Run the dev server
```bash
npm run dev
```

VS Code prints a URL like `http://localhost:5173`. Open it. You should see the Crew login
screen inside a phone frame. **Edit a file and save — the browser updates instantly.** That
instant feedback loop is called *hot module replacement*, and it's the biggest reason to
work locally rather than redeploying a preview every time.

### 1.6 Recommended extensions
In VS Code's Extensions panel (`Ctrl+Shift+X`), install:

- **ESLint** — catches mistakes as you type (the linter that runs in `npm run build`).
- **Prettier** — auto-formats your code so it stays consistent.
- **Error Lens** — shows errors inline, right next to the line that caused them.

> **Checkpoint:** the app runs at `localhost:5173`, and saving a file updates it live.
> You're ready for Claude Code.

---

## Part 2 — Bring in Claude Code (your pair programmer)

**Claude Code** is a coding agent from Anthropic that lives in your terminal and can read
your code, edit files, run commands, and commit to git. It's like having a senior engineer
who never tires. Here's how to set it up.

### 2.1 Install the Claude Code CLI
Anthropic now recommends the **native installer** (not the old npm method). Run the one for
your OS in a terminal:

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

Verify it installed:

```bash
claude --version
```

> Prerequisites: Node LTS / 20+ is required for this Crew app, and a recent VS Code plus an
> Anthropic account (a Claude Pro/Max subscription or an API key) are needed for the Claude
> Code workflow. If you don't have an account, sign up at [claude.ai](https://claude.ai) first.

### 2.2 Install the VS Code extension
Install the official extension from the Marketplace (search "Claude Code" in the Extensions
panel), or run:

```bash
code --install-extension anthropic.claude-code
```

> If the `code` command isn't found, install the extension from the Marketplace panel inside
> VS Code instead — that doesn't need the `code` CLI on your PATH.

### 2.3 Authenticate
In the project folder, start Claude Code:

```bash
cd ~/projects/crew    # or your Windows path
claude
```

On first run it opens a browser for you to log in to Anthropic. After that you're
authenticated.

### 2.4 Write the "syllabus": CLAUDE.md
Claude Code reads a file called **`CLAUDE.md`** at your project root every session — think of
it as the project's syllabus: it tells the AI what the project is, the stack, the conventions,
and what you're trying to build. **I've already written one for you** — it's in the project
as `CLAUDE.md`. Open it and read it; it's the single most important file for working with
Claude Code well.

Also in the project: a **`.gitignore`** (so you never accidentally commit `node_modules`,
build output, or secrets) and an **`.env.example`** (a template for the environment variables
you'll add in Phase 3). Copy `.env.example` to `.env.local` and fill it in when you get there.

### 2.5 How to actually work with it
Inside the `claude` session, you talk to it in plain English. A few patterns that work well:

- **"Read the codebase and explain the project structure."** — its first task in any new project.
- **"Convert the login screen from screens.json into a real React component."** — a concrete,
  scoped change.
- **"Run the build and fix any errors."** — it will run `npm run build` and resolve type errors.
- **`/help`** — lists commands. **`/compact`** — shrinks the conversation when it gets long.

> **Checkpoint:** `claude` runs, it's authenticated, and `CLAUDE.md` is in the project root.

---

## Part 3 — The roadmap (the rest of the build)

This is the part a CS course would call "the project." Five phases, in order. Each builds on
the last, so don't skip ahead — the order exists because each layer depends on the one below.

> **Work in vertical slices, not all-at-once.** Don't convert all 22 screens before touching
> the backend — you'd spend weeks refactoring with nothing real to show for it. Instead, do a
> thin slice end-to-end: convert the Login + Signup + Home screens → add routing → wire real
> auth → *now you have a working login flow.* Then take the next slice (Circle setup → Invite →
> Circle hub) and repeat. Each slice should end with something that actually works.

### Phase 1 — Componentize the screens
**The problem:** right now screens are inert HTML strings. To hold state (what the user typed,
which card they swiped), each screen needs to become a **real React component** — a `.tsx`
file that can receive data (props) and remember things (useState).

**How:** lift one screen's HTML out of `screens.json` into a new file like
`src/screens/LoginScreen.tsx`, keep the same class names (so the CSS still works), and render
that component from `App.tsx` instead of the string. Start with **login** and **home** — they're
small and you'll reuse the pattern.

**Why first:** nothing else (auth, data, swipe state) is possible until screens are components.

> **Heads up on `dangerouslySetInnerHTML`:** it's fine for this static prototype because you
> control all the HTML. But never render *user-generated content* (chat messages, circle
> names typed by strangers) through it later — that's an XSS vulnerability. Those screens must
> be real components with proper escaping.

### Phase 2 — Add routing and state
**The problem:** your hand-rolled `data-nav` route machine is fine for a prototype but won't
scale to a real app with auth gates, deep links, or back-button history.

**How:** install **React Router** (`npm install react-router-dom`) and define routes like
`/login`, `/home`, `/circle/:id`. Add light global state with **Zustand** (tiny and simple)
or React's built-in context — for things like "who is the current user" and "which circle am
I in."

**Why:** once login is real, you need to *protect* routes (no seeing `/home` if you're logged
out). That's routing + state.

### Phase 3 — Add a backend with Supabase
**The problem:** there's nowhere for accounts, circles, plans, or votes to live.

**How:** **Supabase** is an open-source Firebase alternative — it gives you a Postgres
database, authentication, and real-time updates with a great React library.
1. Create a free project at [supabase.com](https://supabase.com).
2. `npm install @supabase/supabase-js`.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and "anon key":
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Create a client in `src/lib/supabase.ts` and use it for auth (`signUp`,
   `signInWithPassword`, `onAuthStateChange`) and database queries.

**Why here:** auth is the first thing that needs a server, and Supabase handles auth + data in
one place. Set up **Row Level Security (RLS)** early — it's the rule that says "users can only
see their own circles," and it's enforced in the database, not just your UI.

> **Security note:** the `VITE_SUPABASE_ANON_KEY` is *safe* to ship in the browser — that's how
> Supabase is designed — **but only because RLS protects the data.** The **service_role key**
> bypasses all security and must **never** go in client code or a `.env` file that Vite bundles.
> Keep it server-side only. Your whole security model rests on RLS policies, so write them
> carefully.

### Phase 4 — Build the real features
Now the screens you listed become real:

- **Forgot password** → Supabase `resetPasswordForEmail`; a screen with an email field that
  sends a reset link, plus a second screen the link lands on where the user types a new
  password. You'll also need to configure the redirect URL in Supabase's Auth settings so the
  reset email points back into the app.
- **Adding contacts to a circle** → a `circle_members` table + an "invite" flow (invite by
  username/email, or a shareable link).
- **Multiple events for swiping** → an `ideas` table queried per circle; the swipe deck
  becomes a component that pulls a real list and records each swipe in the database.

This is where the prototype you built really pays off: every screen already exists as a
**design spec**, so you're translating known-good designs into working code rather than
inventing the UX as you go.

### Phase 5 — Capacitor → iOS/Android → app stores
**The problem:** a website isn't an app you can install from the App Store or Google Play.

**How:** **Capacitor** wraps your web app in a native shell.
```bash
# runtime deps (the native bridge + the two platforms)
npm install @capacitor/core @capacitor/ios @capacitor/android
# dev-only deps (the CLI + asset generator)
npm install -D @capacitor/cli @capacitor/assets

npx cap init "Crew" "com.elizabethv.crew"   # use a unique reverse-domain app ID
```
After `init`, open `capacitor.config.ts` and **confirm `webDir: "dist"`** (that's where Vite
builds to). Then add the platforms and sync after every build:
```bash
npx cap add ios        # needs macOS + Xcode
npx cap add android    # needs Android Studio
npm run build && npx cap sync   # do this after every build
npx cap open ios        # opens Xcode
npx cap open android    # opens Android Studio
```
From Xcode/Android Studio you build, sign, and submit to the stores. Generate icons and
splash screens with `npx capacitor-assets generate`.

> **Why last:** Capacitor wraps a *finished* web app. There's no point wrapping an app that
> doesn't work yet. But once it's wrapped, **test on a real device early** — mobile behavior
> (keyboard, safe areas, gestures) only shows up on hardware, so do device testing before final
> polish.

---

## Part 4 — Your first task in Claude Code (a worked example)

Once `claude` is running in your project folder, give it a focused first job — converting the
login screen into a real component. Try a prompt like this:

> Read CLAUDE.md and src/screens.json. The login screen (screen id "login") is currently an
> HTML string. Lift it into a real React component at src/screens/LoginScreen.tsx, keeping
> the same class names so the existing CSS in src/styles/app.css still applies. Then render it
> from App.tsx instead of the string. Run `npm run build` when you're done and fix any type
> errors.

Notice what makes that prompt good: it's **specific** (which screen, which file), it
**preserves a constraint** (keep the CSS working), and it **verifies itself** (run the build).
That's the pattern to repeat for every screen — login, then signup, then home, then the rest.

---

## Part 5 — How Computer and Claude Code divide the work

You don't have to pick a side forever. Here's the division of labor that works best:

| Task | Use |
|---|---|
| Design exploration, new screen mockups | Perplexity Computer (me) |
| Research (competitors, UX patterns, libraries) | Perplexity Computer (me) |
| Generating app-store screenshots, launch art | Perplexity Computer (me) |
| Writing code, refactoring, backend, tests, git | VS Code + Claude Code |
| Capacitor / native builds / store submission | VS Code (local toolchain required) |

Come back to me when you want to explore what a screen *should* be; go to Claude Code when
you're ready to make it *actually work*.

---

## Quick checklist

- [ ] Node.js LTS installed (`node --version`)
- [ ] Unzip `crew-starter.zip` into a plain local folder
- [ ] `npm install` and `npm run dev` — app runs at `localhost:5173`
- [ ] VS Code extensions: ESLint, Prettier, Error Lens
- [ ] Claude Code CLI installed (`claude --version`) + VS Code extension
- [ ] `CLAUDE.md` is in the project root (it is — read it)
- [ ] First task: convert the login screen to a real component
- [ ] Then: react-router + Zustand → Supabase auth → real features → Capacitor

You've got the design and a working clickable prototype. The hard, creative part — figuring
out *what* to build — is largely done. Now it's the satisfying part: making it real.
