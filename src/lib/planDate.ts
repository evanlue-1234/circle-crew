// chosen_day/chosen_time (set by advance_plan_to_rsvp) are a weekday name and a time-of-day
// bucket, not a concrete datetime — there's no date-range question anywhere upstream to
// narrow further, so "next occurrence of that weekday" is the only well-defined answer, and
// it's mechanically always within 7 days of `from`. Approximate; a later iteration could let
// the captain pin an exact time instead of relying on the bucket's midpoint.
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_HOURS: Record<string, number> = {
  Mornings: 9,
  Afternoons: 14,
  Evenings: 19,
};

export function nextOccurrence(
  chosenDay: string | null,
  chosenTime: string | null,
  from: Date = new Date(),
): Date | null {
  const targetDow = chosenDay ? DAY_NAMES.indexOf(chosenDay) : -1;
  if (targetDow === -1) return null;

  const hour = chosenTime ? (TIME_HOURS[chosenTime] ?? 12) : 12;
  const result = new Date(from);
  result.setHours(hour, 0, 0, 0);

  let daysAhead = (targetDow - from.getDay() + 7) % 7;
  if (daysAhead === 0 && result.getTime() <= from.getTime()) daysAhead = 7;
  result.setDate(result.getDate() + daysAhead);
  return result;
}

export function formatConcreteDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl(title: string, location: string, start: Date, durationMinutes = 120): string {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsTimestamp(start)}/${icsTimestamp(end)}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildMessagesUrl(body: string): string {
  return `sms:&body=${encodeURIComponent(body)}`;
}
