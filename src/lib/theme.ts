import { createPublicServerClient } from "./supabase/public-server";

export type ThemeName = "royal-blue" | "cyan-blue";

export interface ThemeSettings {
  active: ThemeName;
}

export const THEME_KEYS = ["theme_active"] as const;

export const DEFAULT_THEME: ThemeSettings = {
  active: "royal-blue",
};

export const THEME_PRESETS = {
  "royal-blue": {
    label: "Royal Blue",
    description: "Slate + royal blue — modern, calm, premium tech feel",
    primary: "#2F6FED",
    primaryHover: "#1F5AD1",
    background: "#0F1115",
    surface: "#161A22",
    surface2: "#1D2330",
    border: "#2A3140",
    text: "#F5F7FA",
    mutedText: "#9AA4B2",
    accentAlt: "#14B8A6",
    success: "#22C55E",
  },
  "cyan-blue": {
    label: "Electric Cyan",
    description: "Light + electric cyan — modern & premium",
    primary: "#00E5FF",
    primaryHover: "#00B4D8",
    background: "#F4F7FB",
    surface: "#FFFFFF",
    surface2: "#E2E8F0",
    border: "#CBD5E1",
    text: "#0A1F44",
    mutedText: "#475569",
    accentAlt: "#22D3EE",
    success: "#22C55E",
  },
} as const;

// Legacy theme key from earlier builds. Map to the new royal-blue palette.
function normalizeThemeName(raw: unknown): ThemeName {
  if (raw === "royal-blue" || raw === "cyan-blue") return raw;
  if (raw === "neon-green") return "royal-blue";
  return DEFAULT_THEME.active;
}

export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("store_settings")
      .select("key, value")
      .eq("key", "theme_active");

    return { active: normalizeThemeName(data?.[0]?.value) };
  } catch {
    return DEFAULT_THEME;
  }
}
