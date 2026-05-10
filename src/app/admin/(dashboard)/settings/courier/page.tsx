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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  Truck,
  Key,
  Globe,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CourierSettings {
  id: string;
  provider: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  base_url: string;
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
  default_store_id: string;
  webhook_secret: string;
  api_key: string;
  secret_key: string;
  default_weight: number;
}

export default function CourierSettingsPage() {
  const [pathaoSettings, setPathaoSettings] = useState<
    Partial<CourierSettings>
  >({
    provider: "pathao",
    is_enabled: false,
    is_sandbox: true,
    base_url: "https://courier-api-sandbox.pathao.com",
    client_id: "",
    client_secret: "",
    username: "",
    password: "",
    default_store_id: "",
    webhook_secret: "",
    default_weight: 0.5,
  });

  const [steadfastSettings, setSpeedxSettings] = useState<
    Partial<CourierSettings>
  >({
    provider: "steadfast",
    is_enabled: false,
    is_sandbox: true,
    base_url: "https://portal.packzy.com/api/v1",
    api_key: "",
    secret_key: "",
    default_weight: 0.5,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${siteUrl}/api/courier/webhook`;

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("courier_settings").select("*");

    if (data) {
      const pathao = data.find((s) => s.provider === "pathao");
      const steadfast = data.find((s) => s.provider === "steadfast");

      if (pathao) {
        setPathaoSettings((prev) => ({ ...prev, ...pathao }));
      }
      if (steadfast) {
        setSpeedxSettings((prev) => ({ ...prev, ...steadfast }));
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (provider: "pathao" | "steadfast") => {
    setSaving(provider);
    const settings = provider === "pathao" ? pathaoSettings : steadfastSettings;

    try {
      const { error } = await supabase
        .from("courier_settings")
        .upsert({ ...settings, provider }, { onConflict: "provider" });

      if (error) throw error;
      toast.success(
        `${provider === "pathao" ? "Pathao" : "Steadfast"} settings saved`,
      );
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (provider: "pathao" | "steadfast") => {
    setTesting(provider);
    try {
      const endpoint =
        provider === "pathao"
          ? "/api/courier/pathao?action=cities"
          : "/api/courier/steadfast?action=test";

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (provider === "steadfast" && data.success) {
        toast.success(`Steadfast connected! Balance: ৳${data.balance || 0}`);
      } else {
        toast.success(
          `${provider === "pathao" ? "Pathao" : "Steadfast"} connection successful!`,
        );
      }
    } catch (error) {
      toast.error(
        `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setTesting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courier Settings</h1>
          <p className="text-muted-foreground">
            Configure Pathao and Steadfast courier integrations
          </p>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            Use this URL in your Pathao/Steadfast dashboard to receive status
            updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure this webhook URL in your courier merchant dashboard to
            receive real-time order status updates.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="pathao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pathao" className="flex items-center gap-2">
            <Truck className="size-4" />
            Pathao
            {pathaoSettings.is_enabled && (
              <Badge variant="default" className="ml-1">
                Active
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="steadfast" className="flex items-center gap-2">
            <Truck className="size-4" />
            Steadfast
            {steadfastSettings.is_enabled && (
              <Badge variant="default" className="ml-1">
                Active
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pathao Settings */}
        <TabsContent value="pathao">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pathao Configuration</CardTitle>
                  <CardDescription>
                    Configure your Pathao merchant API credentials
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pathaoSettings.is_enabled}
                      onCheckedChange={(checked) =>
                        setPathaoSettings((prev) => ({
                          ...prev,
                          is_enabled: checked,
                        }))
                      }
                    />
                    <Label>Enable</Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Environment Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={pathaoSettings.is_sandbox ? "sandbox" : "production"}
                    onValueChange={(v) => {
                      const isSandbox = v === "sandbox";
                      setPathaoSettings((prev) => ({
                        ...prev,
                        is_sandbox: isSandbox,
                        base_url: isSandbox
                          ? "https://courier-api-sandbox.pathao.com"
                          : "https://api-hermes.pathao.com",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="size-4 text-yellow-500" />
                          Sandbox (Testing)
                        </span>
                      </SelectItem>
                      <SelectItem value="production">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-green-500" />
                          Production (Live)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={pathaoSettings.base_url}
                    onChange={(e) =>
                      setPathaoSettings((prev) => ({
                        ...prev,
                        base_url: e.target.value,
                      }))
                    }
                    placeholder="https://api-hermes.pathao.com"
                  />
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Key className="size-4" />
                  API Credentials
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={pathaoSettings.client_id}
                      onChange={(e) =>
                        setPathaoSettings((prev) => ({
                          ...prev,
                          client_id: e.target.value,
                        }))
                      }
                      placeholder="Your Pathao client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={pathaoSettings.client_secret}
                      onChange={(e) =>
                        setPathaoSettings((prev) => ({
                          ...prev,
                          client_secret: e.target.value,
                        }))
                      }
                      placeholder="Your Pathao client secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username (Email)</Label>
                    <Input
                      type="email"
                      value={pathaoSettings.username}
                      onChange={(e) =>
                        setPathaoSettings((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="merchant@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={pathaoSettings.password}
                      onChange={(e) =>
                        setPathaoSettings((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Your Pathao password"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Store ID</Label>
                  <Input
                    value={pathaoSettings.default_store_id}
                    onChange={(e) =>
                      setPathaoSettings((prev) => ({
                        ...prev,
                        default_store_id: e.target.value,
                      }))
                    }
                    placeholder="Your default pickup store ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input
                    value={pathaoSettings.webhook_secret}
                    onChange={(e) =>
                      setPathaoSettings((prev) => ({
                        ...prev,
                        webhook_secret: e.target.value,
                      }))
                    }
                    placeholder="Secret for webhook verification"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Weight (KG)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pathaoSettings.default_weight}
                    onChange={(e) =>
                      setPathaoSettings((prev) => ({
                        ...prev,
                        default_weight: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleSave("pathao")}
                  disabled={saving === "pathao"}
                >
                  {saving === "pathao" && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  <Save className="size-4 mr-2" />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnection("pathao")}
                  disabled={testing === "pathao"}
                >
                  {testing === "pathao" && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Test Connection
                </Button>
                <a
                  href="https://merchant.pathao.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Pathao Dashboard
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steadfast Settings */}
        <TabsContent value="steadfast">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Steadfast Configuration</CardTitle>
                  <CardDescription>
                    Configure your Steadfast merchant API credentials
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={steadfastSettings.is_enabled}
                      onCheckedChange={(checked) =>
                        setSpeedxSettings((prev) => ({
                          ...prev,
                          is_enabled: checked,
                        }))
                      }
                    />
                    <Label>Enable</Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Environment */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={
                      steadfastSettings.is_sandbox ? "sandbox" : "production"
                    }
                    onValueChange={(v) =>
                      setSpeedxSettings((prev) => ({
                        ...prev,
                        is_sandbox: v === "sandbox",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="production">
                        Production (Live)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={steadfastSettings.base_url}
                    onChange={(e) =>
                      setSpeedxSettings((prev) => ({
                        ...prev,
                        base_url: e.target.value,
                      }))
                    }
                    placeholder="https://portal.packzy.com/api/v1"
                  />
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Key className="size-4" />
                  API Credentials
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      value={steadfastSettings.api_key}
                      onChange={(e) =>
                        setSpeedxSettings((prev) => ({
                          ...prev,
                          api_key: e.target.value,
                        }))
                      }
                      placeholder="Your Steadfast API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={steadfastSettings.secret_key}
                      onChange={(e) =>
                        setSpeedxSettings((prev) => ({
                          ...prev,
                          secret_key: e.target.value,
                        }))
                      }
                      placeholder="Your Steadfast secret key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Weight (KG)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={steadfastSettings.default_weight}
                      onChange={(e) =>
                        setSpeedxSettings((prev) => ({
                          ...prev,
                          default_weight: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleSave("steadfast")}
                  disabled={saving === "steadfast"}
                >
                  {saving === "steadfast" && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  <Save className="size-4 mr-2" />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnection("steadfast")}
                  disabled={testing === "steadfast"}
                >
                  {testing === "steadfast" && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Test Connection
                </Button>
                <a
                  href="https://steadfast.com.bd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Steadfast Dashboard
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
