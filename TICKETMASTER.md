# Crew — Ticketmaster Discovery API

*How to get a key for local-event data feeding the swipe deck. This replaces Eventbrite for
that purpose — see the note at the top of the Eventbrite section in `APIS.md` for why.*

---

## 0. Why Ticketmaster instead of Eventbrite

Eventbrite deprecated public "search events near a location" access for standard API keys
years ago. Its current API only lists events an organizer's own account manages
(`/v3/organizations/{organization_id}/events/`) — not a public feed of local events. Your
Eventbrite private token still works and is still yours to use later if you want to fold in
events from an organization you actually run, but it can't power "show us what's happening in
Raleigh–Durham" on its own.

Ticketmaster's Discovery API still supports genuine public search by city/date with just an
API key — no organizer account, no OAuth, no billing card.

---

## 1. Get the key

1. Create a free account at [developer.ticketmaster.com](https://developer.ticketmaster.com).
2. **My Apps → New App.** Fill in the short form (name, description, website — a placeholder
   is fine for a prototype).
3. Your **Consumer Key** is the API key. Copy it. (The Consumer Secret isn't needed for
   Discovery API's simple search endpoints.)

## 2. Usage + limits

Free tier: **5,000 requests/day**, rate-limited to ~5 requests/second. Plenty for a
prototype. No card required.

```
GET https://app.ticketmaster.com/discovery/v2/events.json
  ?apikey=<key>&city=Raleigh&countryCode=US&sort=date,asc&size=20
```

---

## 3. Use it safely via a Supabase Edge Function

Same rule as Google Places/Eventbrite in `APIS.md` §0: this key is a secret. Never put it in a
`VITE_`-prefixed env var — it must live server-side and be called through a Supabase Edge
Function.

Store the secret (run locally, with the Supabase CLI):

```bash
supabase secrets set TICKETMASTER_API_KEY=your_key
supabase functions deploy ticketmaster
```

The function itself is at `supabase/functions/ticketmaster/index.ts` — it accepts
`{ city, startDate?, endDate? }` and returns `{ events: [{ title, url, start_time, venue,
image_url }] }`.

Call it from React — the browser never sees the key:

```ts
import { supabase } from "./lib/supabase";

const { data, error } = await supabase.functions.invoke("ticketmaster", {
  body: { city: "Raleigh" },
});
```

---

## 4. Where this fits in the roadmap

This is Phase 4 (real features) / Slice 5 of `TASK_SUPABASE_EVENTBRITE.md` — it's the data
source that populates the `ideas` table, which the swipe deck (`SwipeScreen.tsx`) reads from
and records each member's reaction to in `swipes`.

## Quick checklist

- [ ] Ticketmaster developer account created; app registered; Consumer Key copied
- [ ] Key stored as a Supabase secret (`supabase secrets set TICKETMASTER_API_KEY=...`)
- [ ] `supabase functions deploy ticketmaster`
- [ ] App calls `supabase.functions.invoke('ticketmaster')` — key never touches the browser
