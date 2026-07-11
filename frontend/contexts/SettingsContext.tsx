"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeType = "system" | "light" | "dark";

export interface SettingsState {
  theme: ThemeType;
  readReceipts: boolean;
  typingIndicators: boolean;
  lastSeen: boolean;
  browserNotifications: boolean;
  notificationSounds: boolean;
  developerMode: boolean;
  voiceMessagePlaybackSpeed: number;
  autoPlayVoiceMessages: boolean;
}

const defaultSettings: SettingsState = {
  theme: "system",
  readReceipts: true,
  typingIndicators: true,
  lastSeen: true,
  browserNotifications: true,
  notificationSounds: true,
  developerMode: false,
  voiceMessagePlaybackSpeed: 1,
  autoPlayVoiceMessages: false,
};

interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "signal_preferences";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (err) {
      console.warn("Failed to restore settings from localStorage:", err);
    }
    setMounted(true);
  }, []);

  // Persist to localStorage whenever settings change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn("Failed to persist settings to localStorage:", err);
    }
  }, [settings, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (settings.theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else if (settings.theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      // System theme
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isSystemDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }

    // Optional: listen for system theme changes if system is selected
    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add("dark");
          root.classList.remove("light");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
        }
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [settings.theme, mounted]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
