import { supabase } from "./supabase";

export type InviteResult = "invited" | "already_registered" | "already_member" | "email_failed";
export type InviteResultRow = { email: string; result: InviteResult; reason?: string };

export async function sendCircleInvites(circleId: string, emails: string[]): Promise<InviteResultRow[]> {
  const { data, error } = await supabase.functions.invoke("send-circle-invites", {
    body: { circle_id: circleId, emails },
  });
  if (error) throw new Error(error.message);
  return data?.results ?? [];
}

export type AcceptInviteResult = "joined" | "already_member" | "not_invited";

export async function acceptCircleInvite(circleId: string): Promise<AcceptInviteResult> {
  const { data, error } = await supabase.rpc("accept_circle_invite", { p_circle_id: circleId });
  if (error) throw new Error(error.message);
  return data as AcceptInviteResult;
}

export type CircleInvitePreview = {
  circleName: string;
  inviterName: string | null;
  memberNames: string[];
};

/** Null means the caller isn't a member of and wasn't invited to this circle. */
export async function fetchCircleInvitePreview(circleId: string): Promise<CircleInvitePreview | null> {
  const { data, error } = await supabase.rpc("get_circle_invite_preview", { p_circle_id: circleId });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return { circleName: row.circle_name, inviterName: row.inviter_name, memberNames: row.member_names ?? [] };
}
