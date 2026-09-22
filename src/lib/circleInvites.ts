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
