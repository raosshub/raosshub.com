import { useEffect } from "react";

const SESSION_MS = 14 * 60 * 1000; // 14 minutes

export function useSessionMonitor(onExpire: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log("[SESSION] Expired after", SESSION_MS, "ms idle");
        onExpire();
      }, SESSION_MS);
    }

    // Only in dev mode log
    if (import.meta.env.DEV) {
      console.log("[SESSION] Monitor started (14 min timeout)");
    }

    const events = ["click", "keydown", "mousemove", "touchstart"];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, reset));
    };
  }, [onExpire]);
}
