import { useEffect, useRef, useState } from "react";
import { DiscoverAggregateRow, fetchFriendLikedEvents, fetchPopularWithOtherCircles } from "../lib/discoverFeeds";
import { buildMessagesUrl } from "../lib/planDate";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type FeedKey = "nearby" | "circles" | "friends";
type WhenKey = "week" | "nextWeek" | "weekends";
type FilterKey = "feed" | "when";

type DiscoverEvent = {
  id: string;
  title: string;
  source: "ticketmaster" | "local";
  venue: string | null;
  city: string | null;
  start_time: string | null;
  image_url: string | null;
  url: string | null;
  /** e.g. "Booked by 3 groups" / "Liked by 5 friends" — null on the plain nearby feed. */
  badge: string | null;
};

const FEED_OPTIONS: { key: FeedKey; label: string }[] = [
  { key: "nearby", label: "Upcoming Near You" },
  { key: "circles", label: "Popular with Other Circles" },
  { key: "friends", label: "Events Friends are Interested In" },
];

const WHEN_OPTIONS: { key: WhenKey; label: string }[] = [
  { key: "week", label: "In the Next 7 Days" },
  { key: "nextWeek", label: "Next week" },
  { key: "weekends", label: "Weekends Only" },
];

const FEED_EMPTY_MESSAGE: Record<FeedKey, string> = {
  nearby: "No events to show right now.",
  circles: "No popular events from other circles yet.",
  friends: "No events your friends are interested in yet.",
};

const FALLBACK_GRADIENT = "linear-gradient(135deg,#d9956a,#7a3b2e)";
const LOCAL_FALLBACK_GRADIENT = "linear-gradient(135deg,#1f7a6b,#3a8fb0)";

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The Monday that starts next week (Mon–Sun), regardless of which day "today" falls on.
function nextMonday(today: Date) {
  const dow = today.getDay(); // 0 Sun .. 6 Sat
  const daysAhead = dow === 0 ? 1 : 8 - dow;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + daysAhead);
  return monday;
}

function dateRangeFor(when: WhenKey) {
  const today = new Date();

  if (when === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return { startDate: toISODate(today), endDate: toISODate(end) };
  }
  if (when === "nextWeek") {
    const monday = nextMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { startDate: toISODate(monday), endDate: toISODate(sunday) };
  }
  // "weekends" has no fixed end — fetch a wide window and pick out Sat/Sun events client-side
  // below, since the Ticketmaster API only takes a start/end range, not a day-of-week filter.
  const end = new Date(today);
  end.setDate(end.getDate() + 60);
  return { startDate: toISODate(today), endDate: toISODate(end) };
}

function isWeekend(startTime: string) {
  const day = new Date(startTime).getDay();
  return day === 0 || day === 6;
}

function formatWhen(startTime: string | null) {
  if (!startTime) return null;
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Suggest-to-group message works the same for a dated Ticketmaster card or a dateless local
// activity — whatever fields the event actually has just get joined together.
function buildSuggestMessage(event: DiscoverEvent) {
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  const parts = [event.title, location, formatWhen(event.start_time)].filter(Boolean);
  return `Anyone down for this event? ${parts.join(" · ")}`;
}

function toDiscoverEvent(row: DiscoverAggregateRow, badgeLabel: (count: number) => string): DiscoverEvent {
  return {
    id: row.event_key,
    title: row.title,
    source: row.source,
    venue: row.venue,
    city: row.city,
    start_time: row.start_time,
    image_url: row.image_url,
    url: row.url,
    badge: badgeLabel(row.count),
  };
}

// Local activities have no fixed date, so — same as the swipe deck's poll filters
// (src/lib/ideaDeck.ts) — they're shown regardless of the "when" filter rather than excluded
// for lacking a date.
async function fetchNearbyEvents(city: string, when: WhenKey): Promise<DiscoverEvent[]> {
  const { startDate, endDate } = dateRangeFor(when);

  const [tmResult, localResult] = await Promise.all([
    supabase.functions.invoke("ticketmaster", { body: { city, startDate, endDate } }),
    supabase.from("local_activities").select("id, name, city, price_note, vibe"),
  ]);

  const rawEvents: any[] = tmResult.error ? [] : (tmResult.data?.events ?? []);
  const tmEvents: DiscoverEvent[] = rawEvents
    .filter((event) => when !== "weekends" || (event.start_time && isWeekend(event.start_time)))
    .map((event, i) => ({
      id: event.url ?? `tm-${i}`,
      title: event.title,
      source: "ticketmaster" as const,
      venue: event.venue,
      city: null,
      start_time: event.start_time,
      image_url: event.image_url,
      url: event.url,
      badge: null,
    }));

  const localEvents: DiscoverEvent[] = (localResult.data ?? []).map((row) => ({
    id: `local-${row.id}`,
    title: row.name,
    source: "local" as const,
    venue: null,
    city: row.city,
    start_time: null,
    image_url: null,
    url: null,
    badge: null,
  }));

  return [...tmEvents, ...localEvents];
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function DiscoverScreen(_props: Props) {
  const [feed, setFeed] = useState<FeedKey>("nearby");
  const [when, setWhen] = useState<WhenKey>("week");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [city, setCity] = useState("Raleigh");
  const [events, setEvents] = useState<DiscoverEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestTarget, setSuggestTarget] = useState<DiscoverEvent | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase.from("profiles").select("city").eq("id", user.id).single();
      if (!cancelled && data?.city) setCity(data.city);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEvents(null);

    (async () => {
      try {
        let result: DiscoverEvent[];
        if (feed === "nearby") {
          result = await fetchNearbyEvents(city, when);
        } else if (feed === "circles") {
          const rows = await fetchPopularWithOtherCircles();
          result = rows.map((row) => toDiscoverEvent(row, (n) => `Booked by ${n} group${n === 1 ? "" : "s"}`));
        } else {
          const rows = await fetchFriendLikedEvents();
          result = rows.map((row) => toDiscoverEvent(row, (n) => `Liked by ${n} friend${n === 1 ? "" : "s"}`));
        }
        if (!cancelled) setEvents(result);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feed, when, city]);

  const toggleFilter = (filter: FilterKey) => {
    setOpenFilter((current) => (current === filter ? null : filter));
  };

  const feedLabel = FEED_OPTIONS.find((o) => o.key === feed)?.label ?? "";
  const whenLabel = WHEN_OPTIONS.find((o) => o.key === when)?.label ?? "";

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="app-header">
        <h2>Discover</h2>
        <span className="tag tag-soft">📍 Raleigh–Durham</span>
      </div>
      <div className="screen-body">
        <div className="discover-filters" ref={filterRef}>
          <div className="pref-tile" style={{ flex: 1 }}>
            <button
              type="button"
              className={openFilter === "feed" ? "pref-tile-btn open" : "pref-tile-btn"}
              onClick={() => toggleFilter("feed")}
            >
              <span className="pref-tile-label">
                {feedLabel}
                <Chevron />
              </span>
            </button>
            {openFilter === "feed" && (
              <div className="pref-dropdown">
                <div className="pref-option-list">
                  {FEED_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={option.key === feed ? "pref-option selected" : "pref-option"}
                      onClick={() => {
                        setFeed(option.key);
                        setOpenFilter(null);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pref-tile" style={{ flex: 1 }}>
            <button
              type="button"
              className={openFilter === "when" ? "pref-tile-btn open" : "pref-tile-btn"}
              onClick={() => toggleFilter("when")}
            >
              <span className="pref-tile-label">
                {whenLabel}
                <Chevron />
              </span>
            </button>
            {openFilter === "when" && (
              <div className="pref-dropdown">
                <div className="pref-option-list">
                  {WHEN_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={option.key === when ? "pref-option selected" : "pref-option"}
                      onClick={() => {
                        setWhen(option.key);
                        setOpenFilter(null);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "0 18px 18px" }}>
          {loading && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>}

          {!loading && events !== null && events.length === 0 && (
            <div className="empty-state">{FEED_EMPTY_MESSAGE[feed]}</div>
          )}

          {!loading && events && events.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="card"
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSuggestTarget(event);
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "12px",
                      backgroundImage: event.image_url ? `url(${event.image_url})` : undefined,
                      background: event.image_url
                        ? undefined
                        : event.source === "local"
                          ? LOCAL_FALLBACK_GRADIENT
                          : FALLBACK_GRADIENT,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      flexShrink: "0",
                    }}
                  ></div>
                  <div style={{ flex: "1" }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{event.title}</div>
                    <div className="meta-row" style={{ marginTop: "2px" }}>
                      <span>
                        {[event.venue ?? event.city, formatWhen(event.start_time)].filter(Boolean).join(" · ") ||
                          "Details TBA"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    {event.source === "local" && <span className="tag tag-teal">Local pick</span>}
                    {event.badge && <span className="tag tag-primary">{event.badge}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {suggestTarget && (
        <div className="modal-backdrop" onClick={() => setSuggestTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Suggest to your group?</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{suggestTarget.title}</p>
            <div className="modal-actions">
              <a className="btn btn-primary" href={buildMessagesUrl(buildSuggestMessage(suggestTarget))} onClick={() => setSuggestTarget(null)}>
                Yes
              </a>
              <button type="button" className="btn btn-ghost" onClick={() => setSuggestTarget(null)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
