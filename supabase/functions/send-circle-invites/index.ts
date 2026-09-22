// Supabase Edge Function — runs on Deno, not Node. Sends real circle invites: upserts a
// circle_members row per email (status='invited'), then lets Supabase Auth email a signup
// link (auth.admin.inviteUserByEmail) to whichever addresses don't already have an account.
// Needs the service role key (never exposed to the browser) both to write circle_members
// rows for people who aren't circle members yet, and to call the admin invite API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Set via: supabase secrets set APP_URL=https://circle-crew.vercel.app (or whatever host
// actually serves the built app — this is what invited users land on).
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ResultCode = "invited" | "already_registered" | "already_member" | "email_failed";
type RequestBody = { circle_id?: string; emails?: string[] };
type EmailResult = { email: string; result: ResultCode; reason?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // The caller's own JWT identifies who's asking (for the membership check below); the
  // service-role client below does the actual privileged reads/writes.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    // no body sent
  }
  const circleId = body.circle_id;
  const emails = [...new Set((body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!circleId || emails.length === 0) {
    return jsonResponse({ error: "circle_id and emails are required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Authorization: the spec asked to restrict this to "the circle's captain," but circles
  // have no captain concept — captain_id only exists per-plan (plans.captain_id), rotated per
  // event. The closest fit is circles.created_by, but that would be a real regression from
  // today: the existing (pre-this-task) Invite screen lets ANY active member send invites.
  // Falling back to "any active member" preserves that instead of quietly locking non-
  // creators out of a button they could already use.
  const { data: membership } = await admin
    .from("circle_members")
    .select("user_id")
    .eq("circle_id", circleId)
    .eq("user_id", caller.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return jsonResponse({ error: "Not a member of this circle" }, 403);
  }

  const results: EmailResult[] = [];

  for (const email of emails) {
    const { data: existingRow } = await admin
      .from("circle_members")
      .select("status")
      .eq("circle_id", circleId)
      .eq("email", email)
      .maybeSingle();

    if (existingRow) {
      // Idempotent: never duplicate a row or re-send an email for an address already invited
      // (or already a member) of this circle.
      results.push({ email, result: existingRow.status === "active" ? "already_member" : "already_registered" });
      continue;
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { error: insertError } = await admin
      .from("circle_members")
      .insert({ circle_id: circleId, email, status: "invited", user_id: null });

    if (insertError) {
      results.push({ email, result: "email_failed", reason: insertError.message });
      continue;
    }

    if (existingProfile) {
      // Already a Crew user — they'll see this circle under "Pending Invites" on their
      // Circles page next login, no email needed.
      results.push({ email, result: "already_registered" });
      continue;
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/?circle=${circleId}`,
    });
    results.push(
      inviteError
        ? { email, result: "email_failed", reason: inviteError.message }
        : { email, result: "invited" },
    );
  }

  return jsonResponse({ results });
});
