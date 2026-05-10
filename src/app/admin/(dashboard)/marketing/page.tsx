"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, BarChart3, Eye, EyeOff, Info } from "lucide-react";
import { FacebookIcon } from "@/components/icons/SocialIcons";
import { toast } from "sonner";

interface MarketingSettings {
  meta_pixel_enabled: boolean;
  meta_pixel_id: string;
  meta_access_token: string;
  gtm_enabled: boolean;
  gtm_id: string;
}

export default function MarketingManagerPage() {
  const [settings, setSettings] = useState<MarketingSettings>({
    meta_pixel_enabled: false,
    meta_pixel_id: "",
    meta_access_token: "",
    gtm_enabled: false,
    gtm_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("key, value")
        .in("key", [
          "meta_pixel_enabled",
          "meta_pixel_id",
          "meta_access_token",
          "gtm_enabled",
          "gtm_id",
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      for (const row of data || []) {
        settingsMap[row.key] = row.value ?? "";
      }

      setSettings({
        meta_pixel_enabled: settingsMap.meta_pixel_enabled === "true",
        meta_pixel_id: settingsMap.meta_pixel_id || "",
        meta_access_token: settingsMap.meta_access_token || "",
        gtm_enabled: settingsMap.gtm_enabled === "true",
        gtm_id: settingsMap.gtm_id || "",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load marketing settings");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          key: "meta_pixel_enabled",
          value: String(settings.meta_pixel_enabled),
        },
        { key: "meta_pixel_id", value: settings.meta_pixel_id },
        { key: "meta_access_token", value: settings.meta_access_token },
        { key: "gtm_enabled", value: String(settings.gtm_enabled) },
        { key: "gtm_id", value: settings.gtm_id },
      ];

      for (const { key, value } of updates) {
        const { error } = await supabase
          .from("store_settings")
          .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
        if (error) throw error;
      }

      toast.success("Marketing settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save marketing settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Manager</h1>
          <p className="text-muted-foreground">
            Configure Meta Pixel and Google Tag Manager for tracking
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Meta Pixel Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FacebookIcon className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Meta Pixel</CardTitle>
                <CardDescription>
                  Track conversions and build audiences for Facebook & Instagram
                  ads
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="meta-enabled">Enable Meta Pixel</Label>
                <p className="text-sm text-muted-foreground">
                  Load Meta Pixel tracking script on your storefront
                </p>
              </div>
              <Switch
                id="meta-enabled"
                checked={settings.meta_pixel_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, meta_pixel_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixel-id">Pixel ID</Label>
              <Input
                id="pixel-id"
                placeholder="123456789012345"
                value={settings.meta_pixel_id}
                onChange={(e) =>
                  setSettings({ ...settings, meta_pixel_id: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Find your Pixel ID in Meta Events Manager → Data Sources
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-token">Conversions API Access Token</Label>
              <div className="relative">
                <Input
                  id="access-token"
                  type={showAccessToken ? "text" : "password"}
                  placeholder="EAAxxxxxxxxxx..."
                  value={settings.meta_access_token}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      meta_access_token: e.target.value,
                    })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAccessToken ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional: For server-side tracking (Conversions API). Generate
                in Events Manager.
              </p>
            </div>

            {settings.meta_pixel_enabled && !settings.meta_pixel_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please enter your Pixel ID to enable tracking
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Tag Manager Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <BarChart3 className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle>Google Tag Manager</CardTitle>
                <CardDescription>
                  Manage all your marketing tags in one place
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gtm-enabled">Enable Google Tag Manager</Label>
                <p className="text-sm text-muted-foreground">
                  Load GTM container on your storefront
                </p>
              </div>
              <Switch
                id="gtm-enabled"
                checked={settings.gtm_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, gtm_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gtm-id">GTM Container ID</Label>
              <Input
                id="gtm-id"
                placeholder="GTM-XXXXXXX"
                value={settings.gtm_id}
                onChange={(e) =>
                  setSettings({ ...settings, gtm_id: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Find your Container ID in Google Tag Manager dashboard
              </p>
            </div>

            {settings.gtm_enabled && !settings.gtm_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please enter your GTM Container ID to enable tracking
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
          <CardHeader>
            <CardTitle className="text-base">Events Being Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <strong>PageView</strong> — Every page load
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <strong>ViewContent</strong> — Product detail page views
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <strong>AddToCart</strong> — When items are added to cart
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <strong>InitiateCheckout</strong> — Checkout page started
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <strong>Purchase</strong> — Order completed
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
          <CardHeader>
            <CardTitle className="text-base">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Create a Meta Pixel in{" "}
                <a
                  href="https://business.facebook.com/events_manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Meta Events Manager
                </a>
              </li>
              <li>Copy your Pixel ID and paste it above</li>
              <li>Toggle &quot;Enable Meta Pixel&quot; to start tracking</li>
              <li>
                Use the{" "}
                <a
                  href="https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Meta Pixel Helper
                </a>{" "}
                extension to verify
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
