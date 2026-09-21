// Supabase Edge Function — runs on Deno, not Node.
//
// Ticketmaster is the swipe deck's event data source (not Eventbrite — Eventbrite's public
// "search events near a location" endpoint was deprecated years ago and is no longer
// available to standard API keys; its remaining API only lists events an organizer's own
// account manages, not local public events. Ticketmaster's Discovery API still supports
// genuine public search by city/date with just an API key, so it fills the role APIS.md
// originally assigned to Eventbrite. See TICKETMASTER.md for key setup.
//
// The key is a secret: it must never reach the browser, so it's read from a Supabase secret
// here and the app calls this function instead of Ticketmaster directly.

const TICKETMASTER_API_KEY = Deno.env.get("TICKETMASTER_API_KEY")!;

// Supabase Edge Functions don't add CORS headers on their own — a browser calling this via
// supabase.functions.invoke() will have the request blocked before a response is ever seen
// ("Failed to send a request to the Edge Function") unless we handle the OPTIONS preflight
// and echo these headers on every response ourselves.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  city?: string;
  startDate?: string; // ISO date, e.g. "2026-09-01"
  endDate?: string;
};

type TicketmasterImage = { url: string; ratio?: string };
type TicketmasterEvent = {
  name: string;
  url: string;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  images?: TicketmasterImage[];
  _embedded?: { venues?: { name: string }[] };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    // no body sent — use defaults below
  }
  const { city = "Raleigh", startDate, endDate } = body;

  const params = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    city,
    countryCode: "US",
    sort: "date,asc",
    size: "20",
  });
  if (startDate) params.set("startDateTime", `${startDate}T00:00:00Z`);
  if (endDate) params.set("endDateTime", `${endDate}T23:59:59Z`);

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
  if (!res.ok) {
    const body = await res.text();
    return new Response(JSON.stringify({ error: `Ticketmaster API error: ${res.status} ${body}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const json = await res.json();
  const rawEvents: TicketmasterEvent[] = json._embedded?.events ?? [];

  const events = rawEvents.map((event) => ({
    title: event.name,
    url: event.url,
    start_time: event.dates?.start?.dateTime ?? event.dates?.start?.localDate ?? null,
    venue: event._embedded?.venues?.[0]?.name ?? null,
    image_url:
      event.images?.find((img) => img.ratio === "16_9")?.url ?? event.images?.[0]?.url ?? null,
  }));

  return new Response(JSON.stringify({ events }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
