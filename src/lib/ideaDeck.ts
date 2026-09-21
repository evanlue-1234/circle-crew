import { PollAnswers } from "../store";
import { supabase } from "./supabase";

// Shared by SwipeScreen (interactive swiping) and PollScreen's "Choose Events for me"
// (auto-select), so the deck a user would have swiped through and the deck "Choose for me"
// picks from are built by the exact same fetch/backfill/filter/shuffle pipeline.

export type LocalDetails = {
  city: string | null;
  price_note: string | null;
  price_min: number | null;
  vibe: string | null;
  vibe_scale: number | null;
  energy_scale: number | null;
  group_size_note: string | null;
  exclude_tags: string[] | null;
};

export type Idea = {
  id: string;
  title: string;
  venue: string | null;
  start_time: string | null;
  url: string | null;
  image_url: string | null;
  source: "ticketmaster" | "local";
  local: LocalDetails | null;
};

export const SELECT_TARGET = 3;

export const IDEA_COLUMNS =
  "id, title, venue, start_time, url, image_url, source, " +
  "local_activities(city, price_note, price_min, vibe, vibe_scale, energy_scale, group_size_note, exclude_tags)";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// near/moderate/far drive-time buckets for the "how far will you drive" filter — a plain
// lookup table rather than a maps API call.
type Region = "near" | "moderate" | "far";
const CITY_REGION: Record<string, Region> = {
  Raleigh: "near",
  Cary: "near",
  Morrisville: "near",
  Garner: "near",
  Apex: "near",
  Durham: "moderate",
  "Chapel Hill": "moderate",
  Zebulon: "far",
  "Wake Forest": "far",
};

function normalizeIdea(row: any): Idea {
  const localRaw = row.local_activities;
  const local = Array.isArray(localRaw) ? localRaw[0] : localRaw;
  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    start_time: row.start_time,
    url: row.url,
    image_url: row.image_url,
    source: row.source === "local" ? "local" : "ticketmaster",
    local: local
      ? {
          city: local.city ?? null,
          price_note: local.price_note ?? null,
          price_min: local.price_min ?? null,
          vibe: local.vibe ?? null,
          vibe_scale: local.vibe_scale ?? null,
          energy_scale: local.energy_scale ?? null,
          group_size_note: local.group_size_note ?? null,
          exclude_tags: local.exclude_tags ?? null,
        }
      : null,
  };
}

function timeBucket(hour: number) {
  if (hour < 12) return "Mornings";
  if (hour < 17) return "Afternoons";
  return "Evenings";
}

// Deterministic per-plan shuffle (a seeded LCG, not crypto-grade) so the interleaved order
// of local + Ticketmaster cards is stable across reloads for a given plan.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function matchesDrive(city: string | null, drive: string | null, userCity: string | null) {
  if (!drive || !city) return true;
  const region = CITY_REGION[city];
  if (!region) return true; // unknown city — best-effort, don't exclude
  if (drive === "short") return region === "near" && (!userCity || city === userCity);
  if (drive === "dontMind") return region === "near" || region === "moderate";
  return true; // "dayTrip" -> all
}

function matchesBudget(priceMin: number | null, budget: string | null) {
  if (!budget || priceMin == null) return true;
  if (budget === "yes") return priceMin < 20;
  if (budget === "soso") return priceMin < 50;
  return true; // "nope" -> no cap
}

function matchesExclude(tags: string[] | null, notInMood: string[]) {
  if (!tags || tags.length === 0 || notInMood.length === 0) return true;
  const excluded = notInMood.map((s) => s.toLowerCase());
  return !tags.some((tag) => excluded.includes(tag.toLowerCase()));
}

// Days-free/times-free don't apply to local_activities — they're standing venues with no
// fixed date. Drive/budget/exclude are hard filters; vibe and energy use a tolerance that
// widens (1 -> 2) if too few local activities pass.
function matchesLocal(local: LocalDetails, answers: PollAnswers, userCity: string | null, tolerance: number) {
  if (!matchesDrive(local.city, answers.drive, userCity)) return false;
  if (!matchesBudget(local.price_min, answers.budget)) return false;
  if (!matchesExclude(local.exclude_tags, answers.notInMood)) return false;
  if (local.vibe_scale != null && Math.abs(local.vibe_scale - (answers.vibe + 1)) > tolerance) return false;
  if (local.energy_scale != null && Math.abs(local.energy_scale - (answers.energy + 1)) > tolerance) return false;
  return true;
}

// Only day-of-week and time-of-day can be derived from what the ticketmaster Edge Function
// returns per event. Drive distance, budget, vibe, and energy don't map to any field it
// returns, so those answers aren't applied to Ticketmaster-sourced cards.
function matchesTicketmaster(idea: Idea, answers: PollAnswers) {
  if (!idea.start_time) return true;
  const date = new Date(idea.start_time);
  if (Number.isNaN(date.getTime())) return true;

  if (answers.daysFree.length > 0 && !answers.daysFree.includes(DAY_NAMES[date.getDay()])) return false;
  if (answers.timesFree.length > 0 && !answers.timesFree.includes(timeBucket(date.getHours()))) return false;
  return true;
}

function buildDeck(ideas: Idea[], answers: PollAnswers | null, userCity: string | null, tolerance: number) {
  if (!answers) return ideas;
  return ideas.filter((idea) =>
    idea.source === "local" && idea.local
      ? matchesLocal(idea.local, answers, userCity, tolerance)
      : matchesTicketmaster(idea, answers),
  );
}

/** The durable source of truth for a user's poll answers — not a client-only cache, so
 * resuming a plan in a fresh session (or via Circle Hub's "Add your Idea!") still filters
 * correctly. */
export async function fetchPollAnswers(planId: string, userId: string): Promise<PollAnswers | null> {
  const { data } = await supabase
    .from("plan_responses")
    .select("days, times, drive, budget, vibe, energy, not_in_mood")
    .eq("plan_id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    daysFree: data.days ?? [],
    timesFree: data.times ?? [],
    drive: data.drive ?? null,
    budget: data.budget ?? null,
    vibe: data.vibe ?? 1,
    energy: data.energy ?? 1,
    notInMood: data.not_in_mood ?? [],
  };
}

export async function loadDeckForPlan(opts: {
  planId: string;
  userId: string;
  userCity: string | null;
  answers: PollAnswers | null;
}): Promise<Idea[]> {
  const { planId, userId, userCity, answers } = opts;

  const { data: planIdeasRaw } = await supabase.from("ideas").select(IDEA_COLUMNS).eq("plan_id", planId);
  let allRows: any[] = planIdeasRaw ?? [];

  // Checked independently (not "does this plan have any ideas at all") so a plan created
  // before local_activities existed — or loaded before the seed script had run — gets
  // backfilled with whichever source it's missing.
  const hasTicketmaster = allRows.some((row) => row.source === "ticketmaster");
  const hasLocal = allRows.some((row) => row.source === "local");
  const rowsToInsert: any[] = [];

  if (!hasTicketmaster) {
    const { data: fnResult, error: fnError } = await supabase.functions.invoke("ticketmaster", {
      body: { city: "Raleigh" },
    });
    if (fnError) throw new Error(fnError.message);
    rowsToInsert.push(
      ...(fnResult?.events ?? []).map((event: any) => ({
        plan_id: planId,
        source: "ticketmaster",
        title: event.title,
        venue: event.venue,
        start_time: event.start_time,
        url: event.url,
        image_url: event.image_url,
      })),
    );
  }

  if (!hasLocal) {
    const { data: localRows } = await supabase.from("local_activities").select("id, name");
    rowsToInsert.push(
      ...(localRows ?? []).map((row) => ({
        plan_id: planId,
        source: "local",
        local_activity_id: row.id,
        title: row.name,
      })),
    );
  }

  if (rowsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("ideas")
      .insert(rowsToInsert)
      .select(IDEA_COLUMNS);
    if (insertError) throw new Error(insertError.message);
    allRows = [...allRows, ...(inserted ?? [])];
  }

  const allIdeas = allRows.map(normalizeIdea);

  const { data: mySwipes } = await supabase.from("swipes").select("idea_id").eq("user_id", userId);
  const swipedIds = new Set((mySwipes ?? []).map((s) => s.idea_id));
  const unswiped = allIdeas.filter((idea) => !swipedIds.has(idea.id));

  let deck = buildDeck(unswiped, answers, userCity, 1);
  if (deck.length < SELECT_TARGET) {
    deck = buildDeck(unswiped, answers, userCity, 2);
  }
  return seededShuffle(deck, planId);
}
