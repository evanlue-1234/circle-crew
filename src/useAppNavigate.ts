import { useNavigate } from "react-router-dom";
import { PlanIntent, afterPoll } from "./navigation";
import { usePlanStore } from "./store";

/** Matches the onNavigate(target, intent?) signature every screen component already calls. */
export function useAppNavigate() {
  const navigate = useNavigate();
  const intent = usePlanStore((s) => s.intent);
  const setIntent = usePlanStore((s) => s.setIntent);

  return (target: string, newIntent?: PlanIntent) => {
    if (target === "back") {
      navigate(-1);
      return;
    }
    if (newIntent) setIntent(newIntent);
    const resolved = target === "afterPoll" ? afterPoll[newIntent ?? intent] : target;
    navigate(`/${resolved}`);
    window.scrollTo(0, 0);
  };
}
