# Crew — Third-Party APIs (Google Places + Eventbrite)

*How to get API keys for local-place and event data to feed Crew's Discover and swipe-deck
features. Read this before adding either key to your app — the security model is different
from Supabase's.*

---

## 0. The one rule that matters most

Your Supabase publishable key is safe to ship in the browser because Row Level Security
protects the data. **Google Places and Eventbrite keys are the opposite — they are secrets.**
If you put them in a Vite `VITE_`-prefixed env var, Vite bundles them into your JavaScript,
where anyone can read them and run up your bill.

So: these keys live **server-side only**, and your React app calls a small backend function
that uses them. Since you're already on Supabase, the cleanest home for that is a
**Supabase Edge Function** (Section 3).

---

## 1. Google Places API (New)

Google's place data — what you'd use for "coffee near Raleigh," restaurant details, etc.

### Get the key
1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Create a project (e.g. `crew`).
3. **Enable billing:** Billing → Link a billing account. You must add a card — Google won't
   issue a working key without one, even for the free tier.
4. **Enable the API:** APIs & Services → Library → search **"Places API (New)"** (note the
   "(New)" — the legacy version can't be enabled on new projects since March 2025) → Enable.
5. **Create the key:** APIs & Services → Credentials → Create Credentials → API key. Copy it.
6. **Restrict the key (not optional):** Edit the key → set **Application restrictions**
   (HTTP referrers for a website, or your server's IP for a backend) and **API restrictions**
   to only "Places API (New)". Restrictions take ~5 minutes to take effect.

### Billing reality (it changed in March 2025)
The old flat **$200/month free credit is gone.** It's now **per-SKU free monthly caps**
(Essentials: ~10K calls/month, Pro: ~5K, Enterprise: ~1K) — light usage like a prototype
stays free, production traffic bills per 1,000 calls. A card is required regardless.

### How it's called (from your backend, not the browser)
```
POST https://places.googleapis.com/v1/places:searchText
Headers: X-Goog-Api-Key: <key>, X-Goog-FieldMask: places.displayName,places.formattedAddress
Body: { "textQuery": "coffee in Raleigh" }
```

---

## 2. Eventbrite API

> **Correction (2026-08-29):** Eventbrite deprecated public "search events near a location"
> access for standard API keys years ago. The section below (and the private-token setup)
> still works, but only for listing events **your own Eventbrite organizer account manages**
> — not a public feed of local events. Crew's swipe deck uses **Ticketmaster's Discovery
> API** instead, which still supports genuine public search by city/date. See
> `TICKETMASTER.md`. Keep this section if you ever want to fold in your own organization's
> Eventbrite listings later.

Eventbrite's event data — local things happening on a date, useful for the swipe deck.

### Get the key
1. Create a free account at [eventbrite.com](https://www.eventbrite.com).
2. Go to **Account Settings → Developer Links → API Keys → Create API key**.
3. Fill in the form (Application Name, Application URL = your site, a short description; the
   OAuth Redirect URI is optional for personal use). Choose **Create Key**.
4. Back on the API Keys page, choose **Show API key, client secret and tokens**, and copy
   the **Private token**. This is your key.

### Usage + limits
The API is **free** (Eventbrite earns through ticketing fees, not API charges), with a rate
limit of roughly **2,000 requests/hour** per token. You send the token as a Bearer header:

```
GET https://www.eventbriteapi.com/v3/organizations/{org_id}/events/
Headers: Authorization: Bearer <private_token>
```

> For reading your *own* account's data, the private token is all you need. Acting on behalf
> of *other users* requires the full OAuth flow — not something you need for Crew.

---

## 3. Use them safely via a Supabase Edge Function

Store the keys as Supabase secrets (never in `.env` / Vite), then write a small server-side
function that calls Google/Eventbrite and returns clean results to your app.

Store the secrets (run locally, with the Supabase CLI):
```bash
supabase secrets set GOOGLE_PLACES_API_KEY=your_key EVENTBRITE_API_KEY=your_private_token
supabase functions deploy places
```

Sketch of the Edge Function (`supabase/functions/places/index.ts`):
```ts
// Deno + Supabase Edge Functions run Deno, not Node — but the idea is the same.
const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')!
const url = 'https://places.googleapis.com/v1/places:searchText'
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': PLACES_KEY,
    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.id',
  },
  body: JSON.stringify({ textQuery: 'coffee in Raleigh' }),
})
return new Response(JSON.stringify(await res.json()), {
  headers: { 'Content-Type': 'application/json' },
})
```

Call it from React — the browser never sees the keys:
```ts
import { supabase } from '../lib/supabase'

const { data, error } = await supabase.functions.invoke('places', {
  body: { query: 'coffee in Raleigh' },
})
```

The same pattern applies to an `eventbrite` Edge Function that calls the Eventbrite v3 API
with the Bearer token from `Deno.env.get('EVENTBRITE_API_KEY')`.

---

## 4. Where this fits in the roadmap

This is **Phase 4** (real features), specifically the **Discover tab** and the **swipe deck**
that pulls real local ideas. Don't build it until you've got Supabase auth + the `ideas`
table working — these APIs are *sources* that populate ideas, not the storage layer. The
flow is: Edge Function fetches from Google/Eventbrite → you store candidate ideas in the
`ideas` table → the swipe deck reads from `ideas` (governed by RLS).

---

## Quick checklist

- [ ] Google Cloud project created, billing enabled (card required)
- [ ] Places API (New) enabled; API key created + restricted
- [ ] Eventbrite account created; private token copied from API Keys
- [ ] Both keys stored as Supabase secrets (`supabase secrets set …`)
- [ ] Edge Functions `places` + `eventbrite` deployed
- [ ] React app calls `supabase.functions.invoke('places')` — keys never touch the browser
