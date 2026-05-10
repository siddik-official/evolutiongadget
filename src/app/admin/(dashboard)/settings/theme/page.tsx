"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Palette, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  type ThemeName,
  type ThemeSettings,
} from "@/lib/theme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function AdminThemeSettingsPage() {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/store", { cache: "no-store" });
        if (!res.ok) return;
        const data: Record<string, string> = await res.json();
        if (!active) return;
        setTheme({
          active:
            (data.theme_active as ThemeName) || DEFAULT_THEME.active,
          customPrimary:
            data.theme_custom_primary || DEFAULT_THEME.customPrimary,
          customBackground:
            data.theme_custom_background || DEFAULT_THEME.customBackground,
          customForeground:
            data.theme_custom_foreground || DEFAULT_THEME.customForeground,
          customSecondary:
            data.theme_custom_secondary || DEFAULT_THEME.customSecondary,
          customAccent:
            data.theme_custom_accent || DEFAULT_THEME.customAccent,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function setActive(active: ThemeName) {
    setTheme((t) => ({ ...t, active }));
  }

  function setColor(field: keyof ThemeSettings, value: string) {
    setTheme((t) => ({ ...t, [field]: value }));
  }

  function isValidHex(v: string) {
    return HEX_RE.test(v);
  }

  async function handleSave() {
    if (theme.active === "custom") {
      const fields: Array<[string, string]> = [
        ["Primary", theme.customPrimary],
        ["Background", theme.customBackground],
        ["Foreground", theme.customForeground],
        ["Secondary", theme.customSecondary],
        ["Accent", theme.customAccent],
      ];
      const bad = fields.find(([, v]) => !isValidHex(v));
      if (bad) {
        toast.error(`${bad[0]} must be a valid #RRGGBB hex color`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_active: theme.active,
          theme_custom_primary: theme.customPrimary,
          theme_custom_background: theme.customBackground,
          theme_custom_foreground: theme.customForeground,
          theme_custom_secondary: theme.customSecondary,
          theme_custom_accent: theme.customAccent,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Theme saved. Reload any open storefront tab to see changes.");
    } catch {
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold">Theme & Appearance</h1>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          Save Theme
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Active Theme
              </CardTitle>
              <CardDescription>
                Pick a preset or define custom colors. Whatever you save here is
                applied to every customer instantly. Customers cannot change
                this.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map(
                  (key) => {
                    const preset = THEME_PRESETS[key];
                    const isActive = theme.active === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActive(key)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div
                          className="h-16 rounded-lg mb-3 relative overflow-hidden"
                          style={{ backgroundColor: preset.background }}
                        >
                          <span
                            className="absolute bottom-2 right-2 size-6 rounded-full shadow-md"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span
                            className="absolute bottom-2 left-2 size-6 rounded-full shadow-md"
                            style={{ backgroundColor: preset.secondary }}
                          />
                        </div>
                        <p className="font-semibold text-sm">{preset.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {preset.description}
                        </p>
                      </button>
                    );
                  },
                )}

                <button
                  type="button"
                  onClick={() => setActive("custom")}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    theme.active === "custom"
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className="h-16 rounded-lg mb-3 relative overflow-hidden"
                    style={{ backgroundColor: theme.customBackground }}
                  >
                    <span
                      className="absolute bottom-2 right-2 size-6 rounded-full shadow-md"
                      style={{ backgroundColor: theme.customPrimary }}
                    />
                    <span
                      className="absolute bottom-2 left-2 size-6 rounded-full shadow-md"
                      style={{ backgroundColor: theme.customSecondary }}
                    />
                  </div>
                  <p className="font-semibold text-sm">Custom Colors</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Define your own palette below
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {theme.active === "custom" && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Colors</CardTitle>
                <CardDescription>
                  Use the picker or paste a hex value (#RRGGBB). Foreground
                  text colors on primary/accent are auto-derived for contrast.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ColorField
                  label="Primary"
                  helper="Buttons, links, focus rings, accents"
                  value={theme.customPrimary}
                  onChange={(v) => setColor("customPrimary", v)}
                />
                <ColorField
                  label="Background"
                  helper="Main page background"
                  value={theme.customBackground}
                  onChange={(v) => setColor("customBackground", v)}
                />
                <ColorField
                  label="Foreground"
                  helper="Body text, headings"
                  value={theme.customForeground}
                  onChange={(v) => setColor("customForeground", v)}
                />
                <ColorField
                  label="Secondary"
                  helper="Cards, borders, muted surfaces"
                  value={theme.customSecondary}
                  onChange={(v) => setColor("customSecondary", v)}
                />
                <ColorField
                  label="Accent"
                  helper="Hover states, secondary highlights"
                  value={theme.customAccent}
                  onChange={(v) => setColor("customAccent", v)}
                />

                <Preview theme={theme} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ColorField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 sm:items-center">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-10 rounded border cursor-pointer p-0 bg-transparent"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className={`flex h-10 w-32 rounded-md border bg-transparent px-3 py-2 text-sm font-mono uppercase shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            valid ? "border-input" : "border-destructive"
          }`}
        />
        {!valid && (
          <span className="text-xs text-destructive">Invalid hex</span>
        )}
      </div>
    </div>
  );
}

function Preview({ theme }: { theme: ThemeSettings }) {
  return (
    <div className="mt-2 rounded-xl border overflow-hidden">
      <div
        className="p-6"
        style={{
          backgroundColor: theme.customBackground,
          color: theme.customForeground,
        }}
      >
        <p className="text-xs uppercase tracking-widest opacity-70 mb-2">
          Live preview
        </p>
        <h3 className="text-2xl font-bold mb-3">Find your perfect fit.</h3>
        <p className="text-sm opacity-80 mb-4">
          Premium jerseys with authentic designs and unmatched comfort.
        </p>
        <div className="flex flex-wrap gap-3">
          <span
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{
              backgroundColor: theme.customPrimary,
              color: getContrastText(theme.customPrimary),
            }}
          >
            Shop Now
          </span>
          <span
            className="px-4 py-2 rounded-md text-sm font-medium border"
            style={{
              borderColor: theme.customSecondary,
              color: theme.customForeground,
            }}
          >
            View Collection
          </span>
          <span
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: theme.customAccent,
              color: getContrastText(theme.customAccent),
            }}
          >
            New Arrivals
          </span>
        </div>
      </div>
    </div>
  );
}

function getContrastText(hex: string): string {
  if (!HEX_RE.test(hex)) return "#FFFFFF";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lum = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  return lum > 0.5 ? "#0B0B0B" : "#FFFFFF";
}
