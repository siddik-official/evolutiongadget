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
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  type ThemeName,
  type ThemeSettings,
} from "@/lib/theme";

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
        const raw = data.theme_active as ThemeName | undefined;
        const next: ThemeName =
          raw === "neon-green" || raw === "cyan-blue"
            ? raw
            : DEFAULT_THEME.active;
        setTheme({ active: next });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function setActive(active: ThemeName) {
    setTheme({ active });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_active: theme.active }),
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Active Theme
            </CardTitle>
            <CardDescription>
              Pick one of the two presets. Whatever you save here is applied to
              every customer instantly. Customers cannot change this.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
