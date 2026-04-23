"use client";

import { useEffect, useState } from "react";
import {
  getStoredThemeMode,
  setStoredThemeMode,
  themeModeChangedEvent,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    function syncThemeMode() {
      setThemeMode(getStoredThemeMode());
    }

    syncThemeMode();
    window.addEventListener(themeModeChangedEvent, syncThemeMode);
    window.addEventListener("storage", syncThemeMode);

    return () => {
      window.removeEventListener(themeModeChangedEvent, syncThemeMode);
      window.removeEventListener("storage", syncThemeMode);
    };
  }, []);

  const nextThemeMode: ThemeMode = themeMode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextThemeMode} mode`}
      aria-pressed={themeMode === "dark"}
      onClick={() => setStoredThemeMode(nextThemeMode)}
      className="flex h-11 items-center gap-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-2 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)]"
    >
      <span className="px-2">{themeMode === "dark" ? "Dark" : "Light"}</span>
      <span
        className={`flex h-7 w-14 items-center rounded-lg p-1 transition ${
          themeMode === "dark"
            ? "justify-end bg-[#D51919]"
            : "justify-start bg-[var(--brand-soft)]"
        }`}
      >
        <span className="h-5 w-6 rounded-md bg-white shadow-sm" />
      </span>
    </button>
  );
}
