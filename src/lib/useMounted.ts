import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true on the client after hydration, false during SSR.
 * Uses useSyncExternalStore to avoid hydration mismatch and setState in effects.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
