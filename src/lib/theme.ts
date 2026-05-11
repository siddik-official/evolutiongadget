import { createPublicServerClient } from "./supabase/public-server";

export type ThemeName = "neon-green" | "cyan-blue";

export interface ThemeSettings {
  active: ThemeName;
}

export const THEME_KEYS = ["theme_active"] as const;

export const DEFAULT_THEME: ThemeSettings = {
  active: "neon-green",
};

export const THEME_PRESETS = {
  "neon-green": {
    label: "Neon Green",
    description: "Black + neon green — sporty & aggressive",
    primary: "#39FF14",
    background: "#0B0B0B",
    secondary: "#1F1F1F",
  },
  "cyan-blue": {
    label: "Electric Cyan",
    description: "Light + electric cyan — modern & premium",
    primary: "#00E5FF",
    background: "#F4F7FB",
    secondary: "#0A1F44",
  },
} as const;

export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("store_settings")
      .select("key, value")
      .eq("key", "theme_active");

    const rawActive = data?.[0]?.value as ThemeName | undefined;
    const active: ThemeName =
      rawActive === "neon-green" || rawActive === "cyan-blue"
        ? rawActive
        : DEFAULT_THEME.active;

    return { active };
  } catch {
    return DEFAULT_THEME;
  }
}
