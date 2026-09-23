import { FormEvent, useEffect, useRef, useState } from "react";
import { useCircleStore } from "../circleStore";
import { InviteResult, InviteResultRow, sendCircleInvites } from "../lib/circleInvites";
import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESULT_LABEL: Record<InviteResult, string> = {
  invited: "Invited",
  already_registered: "Already on Crew — they'll see it next login",
  already_member: "Already a member",
  email_failed: "Couldn't send",
};

export function InviteScreen({ onNavigate }: Props) {
  const circleId = useCircleStore((s) => s.currentCircleId);
  const [emailInput, setEmailInput] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<InviteResultRow[] | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleAddEmails = (e: FormEvent) => {
    e.preventDefault();
    const parts = emailInput
      .split(";")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;

    const valid: string[] = [];
    const invalid: string[] = [];
    for (const part of parts) {
      if (EMAIL_RE.test(part)) valid.push(part);
      else invalid.push(part);
    }

    const existing = new Set(invitees);
    const newEmails = valid.filter((email) => !existing.has(email));

    setEmailInput("");
    setNotice(invalid.length > 0 ? `Skipped invalid entries: ${invalid.join(", ")}` : null);
    setInvitees((prev) => [...prev, ...newEmails]);
  };

  const removeInvitee = (email: string) => {
    setInvitees((prev) => prev.filter((e) => e !== email));
  };

  const handleSendInvites = async () => {
    if (!circleId || invitees.length === 0) return;
    setSending(true);
    setNotice(null);
    try {
      const sent = await sendCircleInvites(circleId, invitees);
      setResults(sent);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const inviteLink = circleId
    ? `${window.location.origin}${window.location.pathname}#/join?circle=${circleId}`
    : null;
  const inviteMessage = `Join our circle on Crew — we use it to find fun things to do and make plans happen. Tap here to join: ${inviteLink}`;

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Couldn't copy — copy the message above manually.");
    }
  };

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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            We'll email them a link to join — no account needed to receive it.
          </p>

          {results === null ? (
            <>
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
                    disabled={!circleId}
                  >
                    Add
                  </button>
                </div>
                {notice && (
                  <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>{notice}</p>
                )}
                {invitees.length > 0 && (
                  <div className="invite-chip-list">
                    {invitees.map((email) => (
                      <span key={email} className="invite-chip">
                        {email}
                        <button
                          type="button"
                          className="invite-chip-remove"
                          aria-label={`Remove ${email}`}
                          onClick={() => removeInvitee(email)}
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

              <button
                className="btn btn-primary"
                style={{ marginTop: "16px" }}
                disabled={sending || !circleId || invitees.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendInvites();
                }}
              >
                {sending ? "Sending…" : "Send Invites"}
              </button>
            </>
          ) : (
            <>
              <div className="section-label" style={{ padding: "0", marginTop: "16px" }}>
                Results
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {results.map((r) => (
                  <div key={r.email}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13 }}>{r.email}</span>
                      <span
                        className={r.result === "invited" ? "tag tag-success" : "tag tag-soft"}
                      >
                        {RESULT_LABEL[r.result]}
                      </span>
                    </div>
                    {r.reason && (
                      <p style={{ fontSize: 11, color: "var(--warn)", marginTop: 2 }}>{r.reason}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "16px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("circleHub");
                }}
              >
                Done
              </button>
            </>
          )}

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
            "{inviteMessage}"
          </div>
          <button
            className={copied ? "btn btn-dark copied" : "btn btn-dark"}
            style={{ marginTop: "6px" }}
            disabled={!inviteLink}
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
