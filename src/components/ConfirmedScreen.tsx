import { useEffect, useState } from "react";
import {
  buildGoogleCalendarUrl,
  buildMapsUrl,
  buildMessagesUrl,
  formatConcreteDate,
  nextOccurrence,
} from "../lib/planDate";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { usePlanStore } from "../store";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type ChosenIdea = {
  id: string;
  title: string;
  source: "ticketmaster" | "local";
  venue: string | null;
  city: string | null;
  price_note: string | null;
};

type RsvpRow = {
  response: string;
  profiles: { name: string | null } | { name: string | null }[] | null;
};

const AVATAR_COLORS = ["#e2543a", "#1f7a6b", "#d19900", "#7a4fb0", "#3a8fb0"];

function initialsAndName(row: RsvpRow) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const name = profile?.name || "Friend";
  return { name, initial: name.charAt(0).toUpperCase() };
}

export function ConfirmedScreen({ onNavigate }: Props) {
  const planId = usePlanStore((s) => s.currentPlanId);
  const [chosenIdea, setChosenIdea] = useState<ChosenIdea | null>(null);
  const [concreteDate, setConcreteDate] = useState<Date | null>(null);
  const [going, setGoing] = useState<RsvpRow[]>([]);
  const [notGoing, setNotGoing] = useState<RsvpRow[]>([]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;

    (async () => {
      const { data: plan } = await supabase
        .from("plans")
        .select("chosen_idea, chosen_day, chosen_time")
        .eq("id", planId)
        .single();
      if (cancelled || !plan) return;

      setChosenIdea((plan.chosen_idea as ChosenIdea | null) ?? null);
      setConcreteDate(nextOccurrence(plan.chosen_day ?? null, plan.chosen_time ?? null));

      const { data: rsvps } = await supabase
        .from("plan_rsvps")
        .select("response, profiles(name)")
        .eq("plan_id", planId);
      if (cancelled) return;

      const rows = (rsvps ?? []) as RsvpRow[];
      setGoing(rows.filter((r) => r.response === "yes"));
      setNotGoing(rows.filter((r) => r.response === "no"));
    })();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  const whenLabel = formatConcreteDate(concreteDate);
  const location = chosenIdea ? [chosenIdea.venue, chosenIdea.city].filter(Boolean).join(", ") : "";
  const calendarUrl =
    chosenIdea && concreteDate
      ? buildGoogleCalendarUrl(chosenIdea.title, location || chosenIdea.title, concreteDate)
      : null;
  const mapsUrl = chosenIdea
    ? buildMapsUrl([chosenIdea.venue || chosenIdea.title, chosenIdea.city].filter(Boolean).join(" "))
    : null;
  const messagesUrl = chosenIdea
    ? buildMessagesUrl(
        `We're confirmed for ${chosenIdea.title}${whenLabel ? ` on ${whenLabel}` : ""}${
          location ? ` @ ${location}` : ""
        }!`,
      )
    : null;

  return (
    <div className="phone-screen-inner">
      <StatusBar />
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: "14px" }}>
          <div className="celebrate">
            <div className="big-emoji">🎉</div>
            <h3>It's happening!</h3>
            {chosenIdea && (
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {going.length} friend{going.length === 1 ? "" : "s"} confirmed for {chosenIdea.title}
              </div>
            )}
          </div>

          {!chosenIdea && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Loading…</p>
          )}

          {chosenIdea && (
            <>
              <div
                className="photo"
                style={{
                  background:
                    chosenIdea.source === "local"
                      ? "linear-gradient(135deg,#1f7a6b,#3a8fb0)"
                      : "linear-gradient(135deg,#4b2f7a,#d96a8a)",
                  height: "120px",
                  marginTop: "8px",
                }}
              >
                <div className="photo-grad"></div>
                <div className="photo-label">
                  <div className="pl-t">{chosenIdea.title}</div>
                  <div className="pl-s">{whenLabel ?? "Date TBD"}</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: "12px" }}>
                <div className="list-row" style={{ borderTop: "none", paddingTop: "0" }}>
                  <span style={{ fontSize: "20px" }}>📍</span>
                  <div style={{ flex: "1" }}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>
                      {chosenIdea.venue || chosenIdea.title}
                    </div>
                    {chosenIdea.city && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{chosenIdea.city}</div>
                    )}
                  </div>
                </div>
                {chosenIdea.price_note && (
                  <>
                    <div className="divider-line"></div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Cost est. <b style={{ color: "var(--text)" }}>{chosenIdea.price_note}</b>
                    </div>
                  </>
                )}
              </div>

              {(going.length > 0 || notGoing.length > 0) && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <span className="avatar-stack">
                    {going.map((row, i) => {
                      const { name, initial } = initialsAndName(row);
                      return (
                        <span
                          key={`${name}-${i}`}
                          className="avatar"
                          title={name}
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {initial}
                        </span>
                      );
                    })}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {going.length} going{notGoing.length > 0 ? ` · ${notGoing.length} can't make it` : ""}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <a
                  className="btn btn-dark btn-sm"
                  href={calendarUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  style={!calendarUrl ? { pointerEvents: "none", opacity: 0.5 } : undefined}
                >
                  📅 Add to calendar
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href={messagesUrl ?? undefined}
                  style={!messagesUrl ? { pointerEvents: "none", opacity: 0.5 } : undefined}
                >
                  💬 Group chat
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href={mapsUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  style={!mapsUrl ? { pointerEvents: "none", opacity: 0.5 } : undefined}
                >
                  📍 Open in Maps
                </a>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate("home");
                  }}
                >
                  🏠 Back home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
