"use client";

import { useMounted } from "@/lib/useMounted";
import { useState } from "react";

export function ThemeToggle() {
  const mounted = useMounted();
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("weathergpt-theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!mounted}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      aria-pressed={mounted ? isDark : undefined}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-indigo/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-0"
    >
      {mounted && (isDark ? <MoonIcon /> : <SunIcon />)}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M12 2.75v2.1M12 19.15v2.1M4.55 4.55l1.5 1.5M17.95 17.95l1.5 1.5M2.75 12h2.1M19.15 12h2.1M4.55 19.45l1.5-1.5M17.95 6.05l1.5-1.5"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M20.2 14.9A8.4 8.4 0 1 1 9.1 3.8a6.8 6.8 0 0 0 11.1 11.1Z"
      />
    </svg>
  );
}