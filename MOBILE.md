# Going mobile (Capacitor)

The web app is the source of truth; Capacitor wraps it as a native iOS/Android app
without rewriting the UI. Not done yet — these are the steps when you're ready.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init Crew com.example.crew --web-dir=dist
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Then open the native projects:

```bash
npx cap open ios      # requires macOS + Xcode
npx cap open android  # requires Android Studio
```

Notes:
- The app is mobile-first and already uses `100dvh` / full-viewport layout on small screens.
- `viewport-fit=cover` is set; add safe-area insets (`env(safe-area-inset-*)`) to the
  status bar and bottom nav before shipping.
- No backend yet — when you add one, swap the static `screens.json` data for real API calls.
