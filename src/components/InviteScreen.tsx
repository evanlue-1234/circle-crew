import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../authStore";
import { useCircleStore } from "../circleStore";
import { supabase } from "../lib/supabase";
import { PlanIntent } from "../navigation";
import { StatusBar } from "./StatusBar";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

type Invitee = { id: string; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_LINK = "crew.app/crew/x7K2";
const INVITE_MESSAGE = `Join our College Crew circle in Crew. We'll use it to find fun things to do and make plans happen. Tap here to join: ${INVITE_LINK}`;

export function InviteScreen({ onNavigate }: Props) {
  const circleId = useCircleStore((s) => s.currentCircleId);
  const [emailInput, setEmailInput] = useState("");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleAddEmails = async (e: FormEvent) => {
    e.preventDefault();
    const user = useAuthStore.getState().user;
    if (!user || !circleId) return;

    const parts = emailInput
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const valid: string[] = [];
    const invalid: string[] = [];
    for (const part of parts) {
      if (EMAIL_RE.test(part)) valid.push(part);
      else invalid.push(part);
    }

    const existing = new Set(invitees.map((i) => i.email));
    const newEmails = valid.filter((email) => !existing.has(email));

    setEmailInput("");
    setNotice(invalid.length > 0 ? `Skipped invalid entries: ${invalid.join(", ")}` : null);

    if (newEmails.length === 0) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("invites")
      .insert(newEmails.map((email) => ({ circle_id: circleId, email, invited_by: user.id })))
      .select();
    setSubmitting(false);

    if (error || !data) {
      setNotice(error?.message ?? "Couldn't send those invites.");
      return;
    }

    setInvitees((prev) => [...prev, ...data.map((row) => ({ id: row.id, email: row.email }))]);
  };

  const removeInvitee = async (invitee: Invitee) => {
    const { error } = await supabase.from("invites").delete().eq("id", invitee.id);
    if (error) {
      setNotice(error.message);
      return;
    }
    setInvitees((prev) => prev.filter((i) => i.id !== invitee.id));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_MESSAGE);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Couldn't copy — copy the message above manually.");
    }
  };

  return (
    <div className="phone-screen-inner">
      <StatusBar />
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
        <h2 style={{ fontSize: "16px" }}>Invite friends</h2>
        <div style={{ width: "34px" }}></div>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                background: "var(--primary-soft)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                style={{ width: "30px", height: "30px" }}
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="m16 6-4-4-4 4" />
                <path d="M12 2v13" />
              </svg>
            </div>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--text-muted)",
              marginTop: "8px",
            }}
          >
            Share a link by text, email, or your favorite chat. Friends can join
            without a public profile.
          </p>

          <form onSubmit={handleAddEmails} style={{ marginTop: 8 }}>
            <label className="field-label" htmlFor="invite-email">
              Invite by email
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                id="invite-email"
                className="field-input"
                type="text"
                placeholder="alex@mail.com; sam@mail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ marginTop: 0 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "auto", padding: "0 16px" }}
                disabled={submitting || !circleId}
              >
                Add
              </button>
            </div>
            {notice && (
              <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>{notice}</p>
            )}
            {invitees.length > 0 && (
              <div className="invite-chip-list">
                {invitees.map((invitee) => (
                  <span key={invitee.id} className="invite-chip">
                    {invitee.email}
                    <button
                      type="button"
                      className="invite-chip-remove"
                      aria-label={`Remove ${invitee.email}`}
                      onClick={() => removeInvitee(invitee)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </form>

          <div
            className="card"
            style={{
              background: "var(--surface-2)",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "var(--text-muted)",
              marginTop: 16,
            }}
          >
            "Join our College Crew circle in Crew. We'll use it to find fun
            things to do and make plans happen. Tap here to join:{" "}
            <b style={{ color: "var(--primary)" }}>{INVITE_LINK}</b>"
          </div>
          <button
            className={copied ? "btn btn-dark copied" : "btn btn-dark"}
            style={{ marginTop: "6px" }}
            onClick={(e) => {
              e.stopPropagation();
              handleCopyLink();
            }}
          >
            {copied ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: "16px", height: "16px" }}
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: "16px", height: "16px" }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? "Copied!" : "Copy invite link"}
          </button>
          <button
            className="btn btn-outline"
            style={{ marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("circleHub");
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
