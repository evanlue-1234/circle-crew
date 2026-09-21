import { useEffect } from "react";

/** Runs `tick` immediately and then every `intervalMs`, stopping on unmount or when a dep
 * changes. `tick` receives an `isCancelled()` check so an in-flight call can bail out after
 * cleanup instead of setting state on an unmounted component. */
export function usePolling(tick: (isCancelled: () => boolean) => void | Promise<void>, intervalMs: number, deps: unknown[]) {
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    void tick(isCancelled);
    const interval = setInterval(() => {
      void tick(isCancelled);
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
