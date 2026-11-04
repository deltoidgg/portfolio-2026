import { useEffect, useEffectEvent } from "react";
import type { OpportunityHorizon } from "./opportunity-data.ts";

const horizons = [1, 3, 5] as const;

type IdleHandle = { cancel: () => void };

function whenIdle(callback: () => void): IdleHandle {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 4_000 });
    return { cancel: () => window.cancelIdleCallback(handle) };
  }
  const handle = window.setTimeout(callback, 1_500);
  return { cancel: () => window.clearTimeout(handle) };
}

/**
 * A page only loads the forecast horizon it is showing. Once the page is idle this warms the
 * other two through `warm` (a router preload), so switching gameweeks doesn't wait on the network.
 */
export function useWarmHorizons(
  current: OpportunityHorizon,
  warm: (horizon: OpportunityHorizon) => Promise<unknown>,
) {
  const warmOne = useEffectEvent((horizon: OpportunityHorizon) => {
    void warm(horizon).catch(() => undefined);
  });

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;
    const idle = whenIdle(() => {
      for (const horizon of horizons) {
        if (horizon !== current) warmOne(horizon);
      }
    });
    return () => idle.cancel();
  }, [current]);
}
