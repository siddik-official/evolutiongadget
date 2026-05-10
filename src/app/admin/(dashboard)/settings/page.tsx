"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Save,
  Shirt,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Truck,
  ChevronRight,
  Wallet,
  Banknote,
  Palette,
} from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/icons/SocialIcons";
import { toast } from "sonner";
import type { DeliverySetting } from "@/types";
import {
  DEFAULT_DHAKA_CITY_AREAS,
  DEFAULT_SUB_DHAKA_AREAS,
} from "@/lib/delivery";

interface StoreSettingsState {
  customization_enabled: boolean;
  // Option 1: Paid customization
  customization_option_paid_enabled: boolean;
  customization_price: number;
  // Option 2: WhatsApp contact
  customization_option_whatsapp_enabled: boolean;
  customization_whatsapp_text: string;
  customization_whatsapp_number: string;
  // Option 3: Facebook contact
  customization_option_facebook_enabled: boolean;
  customization_facebook_text: string;
  customization_facebook_link: string;
  // Advance payment for customizations
  customization_requires_advance: boolean;
  customization_advance_amount: "delivery" | "half" | "full";
  // General WhatsApp (for backward compatibility)
  whatsapp_number: string;
  delivery_dhaka_city_areas: string;
  delivery_sub_dhaka_areas: string;
}

interface PaymentSettingsState {
  payment_cod_enabled: boolean;
  payment_advance_enabled: boolean;
  payment_bkash_number: string;
  payment_nagad_number: string;
  payment_advance_type: "delivery" | "half" | "full";
}

interface FooterSettingsState {
  footer_phone: string;
  footer_email: string;
  footer_address: string;
  footer_facebook_url: string;
  footer_instagram_url: string;
  footer_brand_description: string;
  footer_google_maps_url: string;
  policy_about_us: string;
  policy_shipping: string;
  policy_returns: string;
  policy_privacy: string;
  policy_terms: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<DeliverySetting[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsState>({
    customization_enabled: false,
    customization_option_paid_enabled: true,
    customization_price: 0,
    customization_option_whatsapp_enabled: false,
    customization_whatsapp_text: "",
    customization_whatsapp_number: "",
    customization_option_facebook_enabled: false,
    customization_facebook_text: "",
    customization_facebook_link: "",
    customization_requires_advance: false,
    customization_advance_amount: "half",
    whatsapp_number: "",
    delivery_dhaka_city_areas: DEFAULT_DHAKA_CITY_AREAS.join("\n"),
    delivery_sub_dhaka_areas: DEFAULT_SUB_DHAKA_AREAS.join("\n"),
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsState>({
    payment_cod_enabled: true,
    payment_advance_enabled: false,
    payment_bkash_number: "",
    payment_nagad_number: "",
    payment_advance_type: "delivery",
  });
  const [footerSettings, setFooterSettings] = useState<FooterSettingsState>({
    footer_phone: "",
    footer_email: "",
    footer_address: "",
    footer_facebook_url: "",
    footer_instagram_url: "",
    footer_brand_description: "",
    footer_google_maps_url: "",
    policy_about_us: "",
    policy_shipping: "",
    policy_returns: "",
    policy_privacy: "",
    policy_terms: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const [deliveryRes, storeRes] = await Promise.all([
      supabase.from("delivery_settings").select("*").order("zone"),
      fetch("/api/settings/store"),
    ]);
    setSettings((deliveryRes.data as DeliverySetting[]) || []);

    if (storeRes.ok) {
      const data = await storeRes.json();
      setStoreSettings({
        customization_enabled: data.customization_enabled === "true",
        customization_option_paid_enabled:
          data.customization_option_paid_enabled !== "false", // default true
        customization_price: parseFloat(data.customization_price || "0") || 0,
        customization_option_whatsapp_enabled:
          data.customization_option_whatsapp_enabled === "true",
        customization_whatsapp_text: data.customization_whatsapp_text || "",
        customization_whatsapp_number: data.customization_whatsapp_number || "",
        customization_option_facebook_enabled:
          data.customization_option_facebook_enabled === "true",
        customization_facebook_text: data.customization_facebook_text || "",
        customization_facebook_link: data.customization_facebook_link || "",
        customization_requires_advance:
          data.customization_requires_advance === "true",
        customization_advance_amount:
          (data.customization_advance_amount as "delivery" | "half" | "full") ||
          "half",
        whatsapp_number: data.whatsapp_number || "",
        delivery_dhaka_city_areas:
          data.delivery_dhaka_city_areas || DEFAULT_DHAKA_CITY_AREAS.join("\n"),
        delivery_sub_dhaka_areas:
          data.delivery_sub_dhaka_areas || DEFAULT_SUB_DHAKA_AREAS.join("\n"),
      });
      setPaymentSettings({
        payment_cod_enabled: data.payment_cod_enabled !== "false",
        payment_advance_enabled: data.payment_advance_enabled === "true",
        payment_bkash_number: data.payment_bkash_number || "",
        payment_nagad_number: data.payment_nagad_number || "",
        payment_advance_type:
          (data.payment_advance_type as "delivery" | "half" | "full") ||
          "delivery",
      });
      setFooterSettings({
        footer_phone: data.footer_phone || "",
        footer_email: data.footer_email || "",
        footer_address: data.footer_address || "",
        footer_facebook_url: data.footer_facebook_url || "",
        footer_instagram_url: data.footer_instagram_url || "",
        footer_brand_description: data.footer_brand_description || "",
        footer_google_maps_url: data.footer_google_maps_url || "",
        policy_about_us: data.policy_about_us || "",
        policy_shipping: data.policy_shipping || "",
        policy_returns: data.policy_returns || "",
        policy_privacy: data.policy_privacy || "",
        policy_terms: data.policy_terms || "",
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = (
    id: string,
    field: string,
    value: string | number | boolean,
  ) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save delivery settings
      for (const s of settings) {
        const { error } = await supabase
          .from("delivery_settings")
          .update({
            charge: s.charge,
            estimated_days: s.estimated_days,
            is_active: s.is_active,
          })
          .eq("id", s.id);
        if (error) throw error;
      }

      // Save store settings (including footer and payment settings)
      const storeRes = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customization_enabled: String(storeSettings.customization_enabled),
          customization_option_paid_enabled: String(
            storeSettings.customization_option_paid_enabled,
          ),
          customization_price: String(storeSettings.customization_price),
          customization_option_whatsapp_enabled: String(
            storeSettings.customization_option_whatsapp_enabled,
          ),
          customization_whatsapp_text:
            storeSettings.customization_whatsapp_text,
          customization_whatsapp_number:
            storeSettings.customization_whatsapp_number,
          customization_option_facebook_enabled: String(
            storeSettings.customization_option_facebook_enabled,
          ),
          customization_facebook_text:
            storeSettings.customization_facebook_text,
          customization_facebook_link:
            storeSettings.customization_facebook_link,
          customization_requires_advance: String(
            storeSettings.customization_requires_advance,
          ),
          customization_advance_amount:
            storeSettings.customization_advance_amount,
          whatsapp_number: storeSettings.whatsapp_number,
          delivery_dhaka_city_areas: storeSettings.delivery_dhaka_city_areas,
          delivery_sub_dhaka_areas: storeSettings.delivery_sub_dhaka_areas,
          // Payment settings
          payment_cod_enabled: String(paymentSettings.payment_cod_enabled),
          payment_advance_enabled: String(
            paymentSettings.payment_advance_enabled,
          ),
          payment_bkash_number: paymentSettings.payment_bkash_number,
          payment_nagad_number: paymentSettings.payment_nagad_number,
          payment_advance_type: paymentSettings.payment_advance_type,
          // Footer settings
          footer_phone: footerSettings.footer_phone,
          footer_email: footerSettings.footer_email,
          footer_address: footerSettings.footer_address,
          footer_facebook_url: footerSettings.footer_facebook_url,
          footer_instagram_url: footerSettings.footer_instagram_url,
          footer_brand_description: footerSettings.footer_brand_description,
          footer_google_maps_url: footerSettings.footer_google_maps_url,
          // Policy content
          policy_about_us: footerSettings.policy_about_us,
          policy_shipping: footerSettings.policy_shipping,
          policy_returns: footerSettings.policy_returns,
          policy_privacy: footerSettings.policy_privacy,
          policy_terms: footerSettings.policy_terms,
        }),
      });
      if (!storeRes.ok) throw new Error("Failed to save store settings");

      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const zoneLabel = (zone: string) => {
    switch (zone) {
      case "inside_dhaka":
        return "Inside Dhaka";
      case "outside_dhaka":
        return "Outside Dhaka";
      case "sub_dhaka":
        return "Sub Dhaka Zone";
      default:
        return zone;
    }
  };

  const zoneDescription = (zone: string) => {
    switch (zone) {
      case "inside_dhaka":
        return "Only listed Dhaka city areas";
      case "sub_dhaka":
        return "Listed sub-dhaka areas in Dhaka district";
      case "outside_dhaka":
        return "All other districts and non-listed Dhaka areas";
      default:
        return "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="max-w-md">
            <ChangePasswordForm />
          </div>

          {/* Courier Settings Link */}
          <Link href="/admin/settings/courier">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Truck className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Courier Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure Pathao & Steadfast API integrations
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          {/* Theme & Appearance Link */}
          <Link href="/admin/settings/theme">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Palette className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Theme & Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                      Pick a preset or define custom site colors. Applies to
                      all customers.
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          {/* Delivery Charges */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Charges</CardTitle>
              <CardDescription>
                Set delivery fees per zone using district and city/area rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-4 border rounded-lg"
                  >
                    <div>
                      <Label>Zone</Label>
                      <p className="text-sm font-medium mt-1">
                        {zoneLabel(s.zone)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {zoneDescription(s.zone)}
                      </p>
                    </div>
                    <div>
                      <Label>Charge (৳)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.charge}
                        onChange={(e) =>
                          updateSetting(
                            s.id,
                            "charge",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Estimated Days</Label>
                      <Input
                        value={s.estimated_days}
                        onChange={(e) =>
                          updateSetting(s.id, "estimated_days", e.target.value)
                        }
                        placeholder="1-2 days"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        onChange={(e) =>
                          updateSetting(s.id, "is_active", e.target.checked)
                        }
                        className="rounded"
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_dhaka_city_areas">
                      Inside Dhaka City Areas
                    </Label>
                    <Textarea
                      id="delivery_dhaka_city_areas"
                      rows={8}
                      value={storeSettings.delivery_dhaka_city_areas}
                      onChange={(e) =>
                        setStoreSettings((prev) => ({
                          ...prev,
                          delivery_dhaka_city_areas: e.target.value,
                        }))
                      }
                      placeholder="One area per line or comma-separated"
                    />
                    <p className="text-xs text-muted-foreground">
                      These areas use the Inside Dhaka delivery charge.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_sub_dhaka_areas">
                      Sub Dhaka Areas
                    </Label>
                    <Textarea
                      id="delivery_sub_dhaka_areas"
                      rows={8}
                      value={storeSettings.delivery_sub_dhaka_areas}
                      onChange={(e) =>
                        setStoreSettings((prev) => ({
                          ...prev,
                          delivery_sub_dhaka_areas: e.target.value,
                        }))
                      }
                      placeholder="One area per line or comma-separated"
                    />
                    <p className="text-xs text-muted-foreground">
                      These areas use the Sub Dhaka delivery charge.
                    </p>
                  </div>
                </div>
                {settings.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No delivery settings found. Run the database schema to seed
                    default values.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Configure how customers can pay for delivery charges. Enable COD
                or Advance Payment (bKash/Nagad Send Money).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* COD Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Banknote className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Cash on Delivery (COD)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Customer pays full amount when order is delivered
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={paymentSettings.payment_cod_enabled}
                    onChange={(e) =>
                      setPaymentSettings((prev) => ({
                        ...prev,
                        payment_cod_enabled: e.target.checked,
                      }))
                    }
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {/* Advance Payment Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-100">
                    <Wallet className="size-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Advance Payment (bKash/Nagad)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Customer sends delivery charge via bKash/Nagad before
                      processing
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={paymentSettings.payment_advance_enabled}
                    onChange={(e) =>
                      setPaymentSettings((prev) => ({
                        ...prev,
                        payment_advance_enabled: e.target.checked,
                      }))
                    }
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {/* bKash/Nagad Numbers - Show only when Advance Payment is enabled */}
              {paymentSettings.payment_advance_enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-pink-50/50">
                    <div>
                      <Label className="flex items-center gap-2">
                        <img
                          src="/bkash.svg"
                          alt="bKash"
                          className="w-5 h-5 object-contain"
                        />
                        bKash Number
                      </Label>
                      <Input
                        value={paymentSettings.payment_bkash_number}
                        onChange={(e) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            payment_bkash_number: e.target.value,
                          }))
                        }
                        placeholder="e.g. 01XXXXXXXXX"
                        className="mt-1 bg-white"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your bKash &quot;Send Money&quot; number
                      </p>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <img
                          src="/nagad.png"
                          alt="Nagad"
                          className="w-5 h-5 object-contain"
                        />
                        Nagad Number
                      </Label>
                      <Input
                        value={paymentSettings.payment_nagad_number}
                        onChange={(e) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            payment_nagad_number: e.target.value,
                          }))
                        }
                        placeholder="e.g. 01XXXXXXXXX"
                        className="mt-1 bg-white"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your Nagad &quot;Send Money&quot; number
                      </p>
                    </div>
                  </div>

                  {/* Advance Payment Type */}
                  <div className="mt-4 p-4 border rounded-lg bg-white">
                    <Label className="font-medium text-sm">
                      Advance Payment Amount
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose how much the customer should pay in advance
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="advance_type"
                          checked={
                            paymentSettings.payment_advance_type === "delivery"
                          }
                          onChange={() =>
                            setPaymentSettings((prev) => ({
                              ...prev,
                              payment_advance_type: "delivery",
                            }))
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-sm">
                            Delivery Charge Only
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Customer pays only delivery charge in advance
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="advance_type"
                          checked={
                            paymentSettings.payment_advance_type === "half"
                          }
                          onChange={() =>
                            setPaymentSettings((prev) => ({
                              ...prev,
                              payment_advance_type: "half",
                            }))
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-sm">Half Payment</p>
                          <p className="text-xs text-muted-foreground">
                            Customer pays 50% of total order amount in advance
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="advance_type"
                          checked={
                            paymentSettings.payment_advance_type === "full"
                          }
                          onChange={() =>
                            setPaymentSettings((prev) => ({
                              ...prev,
                              payment_advance_type: "full",
                            }))
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-sm">Full Payment</p>
                          <p className="text-xs text-muted-foreground">
                            Customer pays entire order amount in advance
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Warning if both disabled */}
              {!paymentSettings.payment_cod_enabled &&
                !paymentSettings.payment_advance_enabled && (
                  <div className="p-3 border border-yellow-300 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ At least one payment method should be enabled for
                      customers to checkout.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Jersey Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="size-5" />
                Jersey Name & Number Customization
              </CardTitle>
              <CardDescription>
                Configure how customers can request custom name and number
                printing. You can enable multiple options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Enable toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Enable Customization</p>
                  <p className="text-xs text-muted-foreground">
                    Show customization options on checkout
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={storeSettings.customization_enabled}
                    onChange={(e) =>
                      setStoreSettings((prev) => ({
                        ...prev,
                        customization_enabled: e.target.checked,
                      }))
                    }
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {storeSettings.customization_enabled && (
                <div className="space-y-5 pl-2 border-l-2 border-primary/20">
                  {/* Option 1: Paid Customization */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="option-paid"
                        checked={
                          storeSettings.customization_option_paid_enabled
                        }
                        onChange={(e) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            customization_option_paid_enabled: e.target.checked,
                          }))
                        }
                        className="size-4"
                      />
                      <label
                        htmlFor="option-paid"
                        className="font-medium text-sm cursor-pointer"
                      >
                        Option 1: Paid Customization (Input Fields)
                      </label>
                    </div>
                    {storeSettings.customization_option_paid_enabled && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label>Customization Price (৳ per item)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={storeSettings.customization_price}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                customization_price:
                                  parseFloat(e.target.value) || 0,
                              }))
                            }
                            placeholder="e.g. 250"
                            className="mt-1 max-w-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Customers can enter name & number directly. This
                            amount will be added per customized jersey.
                          </p>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            <MessageCircle className="size-3 text-green-600" />
                            WhatsApp Number (for confirmation)
                          </Label>
                          <Input
                            value={storeSettings.whatsapp_number}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                whatsapp_number: e.target.value,
                              }))
                            }
                            placeholder="e.g. 01XXXXXXXXX"
                            className="mt-1 max-w-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Customers will see a note to confirm via WhatsApp
                          </p>
                        </div>

                        {/* Require Advance Payment for Customized Orders */}
                        <div className="mt-4 p-4 border rounded-lg bg-amber-50/50 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="font-medium text-sm flex items-center gap-2">
                                <Wallet className="size-4 text-amber-600" />
                                Require Advance Payment for Customization
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                When enabled, customers with customized jerseys
                                must pay 50% advance
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={
                                  storeSettings.customization_requires_advance
                                }
                                onChange={(e) =>
                                  setStoreSettings((prev) => ({
                                    ...prev,
                                    customization_requires_advance:
                                      e.target.checked,
                                  }))
                                }
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                            </label>
                          </div>
                          {storeSettings.customization_requires_advance && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-xs text-amber-800">
                                ⚠️ Customers who add name/number customization
                                will be required to pay{" "}
                                <strong>50% of the total order amount</strong>{" "}
                                in advance via bKash/Nagad. Make sure you have
                                set up your bKash/Nagad numbers in the Payment
                                Methods section above.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: WhatsApp Contact */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="option-whatsapp"
                        checked={
                          storeSettings.customization_option_whatsapp_enabled
                        }
                        onChange={(e) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            customization_option_whatsapp_enabled:
                              e.target.checked,
                          }))
                        }
                        className="size-4"
                      />
                      <label
                        htmlFor="option-whatsapp"
                        className="font-medium text-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageCircle className="size-4 text-green-600" />
                        Option 2: WhatsApp Contact
                      </label>
                    </div>
                    {storeSettings.customization_option_whatsapp_enabled && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label>Display Text</Label>
                          <Input
                            value={storeSettings.customization_whatsapp_text}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                customization_whatsapp_text: e.target.value,
                              }))
                            }
                            placeholder="e.g. Contact us on WhatsApp for jersey customization"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This text will be shown to customers
                          </p>
                        </div>
                        <div>
                          <Label>WhatsApp Number</Label>
                          <Input
                            value={storeSettings.customization_whatsapp_number}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                customization_whatsapp_number: e.target.value,
                              }))
                            }
                            placeholder="e.g. 01XXXXXXXXX"
                            className="mt-1 max-w-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Customer will be directed to this WhatsApp number
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 3: Facebook Contact */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="option-facebook"
                        checked={
                          storeSettings.customization_option_facebook_enabled
                        }
                        onChange={(e) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            customization_option_facebook_enabled:
                              e.target.checked,
                          }))
                        }
                        className="size-4"
                      />
                      <label
                        htmlFor="option-facebook"
                        className="font-medium text-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <FacebookIcon className="size-4" />
                        Option 3: Facebook Contact
                      </label>
                    </div>
                    {storeSettings.customization_option_facebook_enabled && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label>Display Text</Label>
                          <Input
                            value={storeSettings.customization_facebook_text}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                customization_facebook_text: e.target.value,
                              }))
                            }
                            placeholder="e.g. Message us on Facebook for jersey customization"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This text will be shown to customers
                          </p>
                        </div>
                        <div>
                          <Label>Facebook Page Link</Label>
                          <Input
                            value={storeSettings.customization_facebook_link}
                            onChange={(e) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                customization_facebook_link: e.target.value,
                              }))
                            }
                            placeholder="e.g. https://facebook.com/yourpage"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Customer will be directed to this Facebook page
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-5" />
                Footer Contact Information
              </CardTitle>
              <CardDescription>
                Contact details displayed in the website footer. Customers can
                use these to reach your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    <Phone className="size-3 inline mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    value={footerSettings.footer_phone}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_phone: e.target.value,
                      }))
                    }
                    placeholder="e.g. 01313542742"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact phone number shown in footer
                  </p>
                </div>

                <div>
                  <Label>
                    <Mail className="size-3 inline mr-1" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={footerSettings.footer_email}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_email: e.target.value,
                      }))
                    }
                    placeholder="e.g. info@evolutiongadget.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact email shown in footer
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    <MapPin className="size-3 inline mr-1" />
                    Physical Address
                  </Label>
                  <Input
                    value={footerSettings.footer_address}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_address: e.target.value,
                      }))
                    }
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Business location shown in footer
                  </p>
                </div>

                <div>
                  <Label>
                    <MapPin className="size-3 inline mr-1" />
                    Google Maps URL (Optional)
                  </Label>
                  <Input
                    type="url"
                    value={footerSettings.footer_google_maps_url}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_google_maps_url: e.target.value,
                      }))
                    }
                    placeholder="https://maps.google.com/..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link to your Google Maps location
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FacebookIcon className="size-5" />
                Footer Social Media Links
              </CardTitle>
              <CardDescription>
                Social media profile URLs displayed in the footer. Leave empty
                to hide the icon from the footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    <FacebookIcon className="size-3 inline mr-1 text-blue-600" />
                    Facebook URL
                  </Label>
                  <Input
                    type="url"
                    value={footerSettings.footer_facebook_url}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_facebook_url: e.target.value,
                      }))
                    }
                    placeholder="https://facebook.com/evolutiongadget"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Facebook page or profile URL
                  </p>
                </div>

                <div>
                  <Label>
                    <InstagramIcon className="size-3 inline mr-1 text-pink-600" />
                    Instagram URL
                  </Label>
                  <Input
                    type="url"
                    value={footerSettings.footer_instagram_url}
                    onChange={(e) =>
                      setFooterSettings((prev) => ({
                        ...prev,
                        footer_instagram_url: e.target.value,
                      }))
                    }
                    placeholder="https://instagram.com/evolutiongadget"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Instagram profile URL
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Brand Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Footer Brand Description
              </CardTitle>
              <CardDescription>
                Short description shown in the footer about your brand (2-3
                sentences recommended).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Brand Description</Label>
                <Textarea
                  rows={3}
                  value={footerSettings.footer_brand_description}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      footer_brand_description: e.target.value,
                    }))
                  }
                  placeholder="Your trusted source for authentic jerseys..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Brief description of your business shown in footer
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Policy Pages Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Policy Pages Content
              </CardTitle>
              <CardDescription>
                Full content for policy pages. This content will be displayed on
                dedicated pages like /about, /shipping, /returns, etc. Supports
                plain text with line breaks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>About Us</Label>
                <Textarea
                  rows={8}
                  value={footerSettings.policy_about_us}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      policy_about_us: e.target.value,
                    }))
                  }
                  placeholder="Welcome to Evolution Gadget – your ultimate destination for..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content shown on /about page
                </p>
              </div>

              <div>
                <Label>Shipping Policy</Label>
                <Textarea
                  rows={8}
                  value={footerSettings.policy_shipping}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      policy_shipping: e.target.value,
                    }))
                  }
                  placeholder="Fast & Reliable Delivery Across Bangladesh..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content shown on /shipping page
                </p>
              </div>

              <div>
                <Label>Returns & Exchange Policy</Label>
                <Textarea
                  rows={8}
                  value={footerSettings.policy_returns}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      policy_returns: e.target.value,
                    }))
                  }
                  placeholder="Check your product carefully when you receive it..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content shown on /returns page
                </p>
              </div>

              <div>
                <Label>Privacy Policy</Label>
                <Textarea
                  rows={8}
                  value={footerSettings.policy_privacy}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      policy_privacy: e.target.value,
                    }))
                  }
                  placeholder="Your data is safe. We collect and use your personal information..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content shown on /privacy page
                </p>
              </div>

              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  rows={8}
                  value={footerSettings.policy_terms}
                  onChange={(e) =>
                    setFooterSettings((prev) => ({
                      ...prev,
                      policy_terms: e.target.value,
                    }))
                  }
                  placeholder="By using the Evolution Gadget website, you agree to these terms..."
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content shown on /terms page
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
