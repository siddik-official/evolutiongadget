import { createPublicServerClient } from "./supabase/public-server";

export type ThemeName = "neon-green" | "cyan-blue" | "custom";

export interface ThemeSettings {
  active: ThemeName;
  customPrimary: string;
  customBackground: string;
  customForeground: string;
  customSecondary: string;
  customAccent: string;
}

export const THEME_KEYS = [
  "theme_active",
  "theme_custom_primary",
  "theme_custom_background",
  "theme_custom_foreground",
  "theme_custom_secondary",
  "theme_custom_accent",
] as const;

export const DEFAULT_THEME: ThemeSettings = {
  active: "neon-green",
  customPrimary: "#39FF14",
  customBackground: "#0B0B0B",
  customForeground: "#F2F2F2",
  customSecondary: "#1F1F1F",
  customAccent: "#1F1F1F",
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
      .in("key", THEME_KEYS as unknown as string[]);

    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key] = row.value ?? "";

    const rawActive = map.theme_active as ThemeName | undefined;
    const active: ThemeName =
      rawActive === "neon-green" ||
      rawActive === "cyan-blue" ||
      rawActive === "custom"
        ? rawActive
        : DEFAULT_THEME.active;

    return {
      active,
      customPrimary: map.theme_custom_primary || DEFAULT_THEME.customPrimary,
      customBackground:
        map.theme_custom_background || DEFAULT_THEME.customBackground,
      customForeground:
        map.theme_custom_foreground || DEFAULT_THEME.customForeground,
      customSecondary:
        map.theme_custom_secondary || DEFAULT_THEME.customSecondary,
      customAccent: map.theme_custom_accent || DEFAULT_THEME.customAccent,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

// Convert "#RRGGBB" to the "h s% l%" format used by our CSS variables.
export function hexToHslTokens(hex: string): string {
  const m = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return "0 0% 0%";

  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Pick a readable foreground (near-white or near-black) given a hex bg.
export function readableForegroundTokens(hex: string): string {
  const m = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return "0 0% 98%";
  const toLin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(m.slice(0, 2), 16));
  const g = toLin(parseInt(m.slice(2, 4), 16));
  const b = toLin(parseInt(m.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "0 0% 7%" : "0 0% 98%";
}

export function buildCustomThemeCss(t: ThemeSettings): string {
  const bg = hexToHslTokens(t.customBackground);
  const fg = hexToHslTokens(t.customForeground);
  const primary = hexToHslTokens(t.customPrimary);
  const primaryFg = readableForegroundTokens(t.customPrimary);
  const secondary = hexToHslTokens(t.customSecondary);
  const secondaryFg = readableForegroundTokens(t.customSecondary);
  const accent = hexToHslTokens(t.customAccent);
  const accentFg = readableForegroundTokens(t.customAccent);

  return `:root[data-theme="custom"]{--background:${bg};--foreground:${fg};--card:${bg};--card-foreground:${fg};--popover:${bg};--popover-foreground:${fg};--primary:${primary};--primary-foreground:${primaryFg};--secondary:${secondary};--secondary-foreground:${secondaryFg};--muted:${secondary};--muted-foreground:${fg};--accent:${accent};--accent-foreground:${accentFg};--border:${secondary};--input:${secondary};--ring:${primary};--chart-1:${primary};--chart-2:${fg};--chart-3:${accent};--chart-4:${secondary};--chart-5:${primary};--sidebar-background:${bg};--sidebar-foreground:${fg};--sidebar-primary:${primary};--sidebar-primary-foreground:${primaryFg};--sidebar-accent:${accent};--sidebar-accent-foreground:${accentFg};--sidebar-border:${secondary};--sidebar-ring:${primary};--theme-dark:${t.customBackground};--theme-dark-from:${t.customBackground};--theme-dark-via:${t.customBackground};--theme-dark-to:${t.customSecondary};--theme-dot:${t.customPrimary};--theme-glow:${primary}}`;
}
