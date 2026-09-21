// One-time (and re-runnable) seed script for the `local_activities` table.
//
// Run with the SERVICE ROLE key, never the publishable key — this must never be a
// VITE_-prefixed env var, since Vite bundles those into client JS and the service role key
// bypasses RLS entirely. Usage:
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx \
//     npm run seed:activities
//
// Re-running it updates existing rows (matched on name+city, via the unique constraint added
// in migration 0009) instead of duplicating them — drop new entries into
// crew-activities.json and re-run any time to add more.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY, then re-run.",
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "crew-activities.json");
const activities = JSON.parse(readFileSync(dataPath, "utf-8"));

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { error: upsertError } = await supabase
  .from("local_activities")
  .upsert(activities, { onConflict: "name,city" });

if (upsertError) {
  console.error("Seed failed:", upsertError.message);
  process.exit(1);
}

const { count, error: countError } = await supabase
  .from("local_activities")
  .select("id", { count: "exact", head: true });

if (countError) {
  console.error(
    `Upserted ${activities.length} rows, but couldn't verify the table's row count: ${countError.message}`,
  );
  process.exit(1);
}

console.log(`Upserted ${activities.length} rows from crew-activities.json. Table now has ${count} rows.`);
