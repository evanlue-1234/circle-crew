import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "../authStore";
import { acceptNdaForUser } from "../lib/ndaAcceptance";
import { supabase } from "../lib/supabase";
import { NdaAgreement } from "./NdaAgreement";

type Props = {
  children: ReactNode;
};

/** Wraps the Home route: a logged-in user whose profile has no nda_accepted_at sees the
 * gate instead of Home until they agree. Every other protected screen is reached through Home
 * first, so gating just this one entry point is enough — intentionally not duplicated onto
 * every route. */
export function NdaGate({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("nda_accepted_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setAccepted(!!data?.nda_accepted_at);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || accepted === null) return null;
  if (accepted) return <>{children}</>;

  const handleAgree = async () => {
    setSaving(true);
    try {
      await acceptNdaForUser(user.id);
      setAccepted(true);
    } finally {
      setSaving(false);
    }
  };

  return <NdaAgreement onAgree={handleAgree} busy={saving} />;
}
