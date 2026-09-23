import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  city: string;
  email: string;
  phone: string;
};

type Circle = { id: string; name: string };

const EMPTY_FORM: ProfileForm = { firstName: "", lastName: "", city: "", email: "", phone: "" };
const AVATAR_COLORS = ["#e2543a", "#1f7a6b", "#d19900", "#7a4fb0", "#3a8fb0", "#d96a8a"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function splitName(name: string | null) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function joinName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function ProfileScreen({ onNavigate }: Props) {
  const [saved, setSaved] = useState<ProfileForm>(EMPTY_FORM);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[] | null>(null);

  const [pollReminders, setPollReminders] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [planConfirmations, setPlanConfirmations] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, city, phone")
        .eq("id", user.id)
        .single();
      if (cancelled) return;

      const { firstName, lastName } = splitName(profile?.name ?? null);
      const next: ProfileForm = {
        firstName,
        lastName,
        city: profile?.city ?? "",
        email: user.email ?? "",
        phone: profile?.phone ?? "",
      };
      setSaved(next);
      setForm(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Querying `circles` directly would still return circles this user has left, because
      // its RLS select policy also allows `created_by = auth.uid()` (needed so a creator's
      // INSERT...RETURNING succeeds before their circle_members row exists — see
      // schema.sql). Driving this list from active circle_members rows instead means a
      // circle disappears here the moment they leave, even if they created it.
      const { data: memberships } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (cancelled) return;

      const circleIds = (memberships ?? []).map((m) => m.circle_id);
      if (circleIds.length === 0) {
        setCircles([]);
        return;
      }

      const { data } = await supabase
        .from("circles")
        .select("id, name")
        .in("id", circleIds)
        .order("created_at", { ascending: false });
      if (!cancelled) setCircles(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startEdit = () => {
    setForm(saved);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setForm(saved);
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    setError(null);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: joinName(form.firstName, form.lastName),
        city: form.city || null,
        phone: form.phone || null,
        // Kept in sync with the auth email below — invite matching (accept_circle_invite,
        // the circles/circle_members RLS clauses) reads this column, not auth.users.email.
        email: form.email ? form.email.toLowerCase() : null,
      })
      .eq("id", user.id);

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    if (form.email !== saved.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: form.email });
      if (emailError) {
        setSaving(false);
        setError(emailError.message);
        return;
      }
    }

    setSaving(false);
    setSaved(form);
    setEditing(false);
  };

  const fullName = joinName(saved.firstName, saved.lastName);
  const initial = (fullName || saved.email || "?")[0]?.toUpperCase() ?? "?";

  return (
    <div className="phone-screen-inner">
      <div className="app-header">
        <button
          className="ghost-btn"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("back");
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px" }}>Settings</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad" style={{ paddingTop: "14px" }}>
          {!editing && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    fontWeight: "700",
                    fontSize: "20px",
                  }}
                >
                  {initial}
                </div>
                <div style={{ flex: "1" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "700",
                      fontSize: "16px",
                    }}
                  >
                    {fullName || "Add your name"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {saved.city || "Add your city"} &middot; {circles?.length ?? 0} circle
                    {(circles?.length ?? 0) === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit();
                  }}
                >
                  Edit
                </button>
              </div>
              <div className="card" style={{ marginTop: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Email
                  </span>
                  <span style={{ fontSize: "13px" }}>{saved.email || "—"}</span>
                </div>
                <div className="divider-line" style={{ margin: "8px 0" }}></div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Phone{" "}
                    <span style={{ color: "var(--text-faint)" }}>
                      (group texts)
                    </span>
                  </span>
                  <span style={{ fontSize: "13px" }}>{saved.phone || "—"}</span>
                </div>
              </div>
            </>
          )}

          {editing && (
            <>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    fontWeight: "700",
                    fontSize: "20px",
                    margin: "0 auto",
                  }}
                >
                  {initial}
                </div>
              </div>

              <label className="field-label" style={{ marginTop: 14 }}>
                First name
              </label>
              <input
                className="field-input"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />

              <label className="field-label" style={{ marginTop: 10 }}>
                Last name
              </label>
              <input
                className="field-input"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />

              <label className="field-label" style={{ marginTop: 10 }}>
                City
              </label>
              <input
                className="field-input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />

              <label className="field-label" style={{ marginTop: 10 }}>
                Email address
              </label>
              <input
                className="field-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />

              <label className="field-label" style={{ marginTop: 10 }}>
                Phone number
              </label>
              <input
                className="field-input"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />

              {error && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 8 }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}

          <div
            className="section-label"
            style={{ padding: "0", marginTop: "14px" }}
          >
            Your circles
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {circles?.map((circle) => (
              <div key={circle.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="avatar" style={{ background: colorFor(circle.id) }}>
                  {circle.name[0]?.toUpperCase() ?? "?"}
                </span>
                <div style={{ flex: "1", fontSize: "13px" }}>{circle.name}</div>
              </div>
            ))}
            {circles?.length === 0 && <div className="empty-state">No circles yet.</div>}
          </div>

          <div
            className="section-label"
            style={{ padding: "0", marginTop: "14px" }}
          >
            Notifications
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setPollReminders((v) => !v);
            }}
          >
            <span style={{ fontSize: "13px" }}>Poll reminders</span>
            <span className={pollReminders ? "toggle on" : "toggle"}></span>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEventReminders((v) => !v);
            }}
          >
            <span style={{ fontSize: "13px" }}>Event reminders</span>
            <span className={eventReminders ? "toggle on" : "toggle"}></span>
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setPlanConfirmations((v) => !v);
            }}
          >
            <span style={{ fontSize: "13px" }}>Plan confirmations</span>
            <span className={planConfirmations ? "toggle on" : "toggle"}></span>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: "16px", color: "var(--warn)" }}
            onClick={async (e) => {
              e.stopPropagation();
              await supabase.auth.signOut();
              onNavigate("login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
