"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Loader2,
  ShoppingBag,
  AlertCircle,
  Shirt,
  Ticket,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import {
  formatPrice,
  validateBDPhone,
  normalizePhone,
  formatVariantShort,
} from "@/lib/utils";
import { BD_ALL_DISTRICTS } from "@/lib/constants";
import {
  DEFAULT_DHAKA_CITY_AREAS,
  DEFAULT_SUB_DHAKA_AREAS,
  type DeliveryZone,
  readDeliveryAreaSettings,
  resolveDeliveryZone,
} from "@/lib/delivery";
import { trackInitiateCheckout } from "@/lib/analytics";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { Coupon } from "@/types";

interface Customization {
  name: string;
  number: string;
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [dhakaCityAreas, setDhakaCityAreas] = useState<string[]>(
    DEFAULT_DHAKA_CITY_AREAS,
  );
  const [subDhakaAreas, setSubDhakaAreas] = useState<string[]>(
    DEFAULT_SUB_DHAKA_AREAS,
  );
  const [address, setAddress] = useState("");
  const [deliveryZone, setDeliveryZone] =
    useState<DeliveryZone>("inside_dhaka");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delivery charges from DB
  const [deliveryCharges, setDeliveryCharges] = useState<
    Record<string, number>
  >({
    inside_dhaka: 60,
    sub_dhaka: 80,
    outside_dhaka: 120,
  });

  // Customization settings
  const [customizationEnabled, setCustomizationEnabled] = useState(false);
  const [customizationOptionPaidEnabled, setCustomizationOptionPaidEnabled] =
    useState(false);
  const [customizationPrice, setCustomizationPrice] = useState(0);
  const [
    customizationOptionWhatsappEnabled,
    setCustomizationOptionWhatsappEnabled,
  ] = useState(false);
  const [customizationWhatsappText, setCustomizationWhatsappText] =
    useState("");
  const [customizationWhatsappNumber, setCustomizationWhatsappNumber] =
    useState("");
  const [
    customizationOptionFacebookEnabled,
    setCustomizationOptionFacebookEnabled,
  ] = useState(false);
  const [customizationFacebookText, setCustomizationFacebookText] =
    useState("");
  const [customizationFacebookLink, setCustomizationFacebookLink] =
    useState("");
  // Advance payment required for customization
  const [customizationRequiresAdvance, setCustomizationRequiresAdvance] =
    useState(false);
  // key: variantId, value: array of {name,number} per unit (index = jersey unit 0..quantity-1)
  const [customizations, setCustomizations] = useState<
    Record<string, Customization[]>
  >({});

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    description?: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [publicCoupons, setPublicCoupons] = useState<Coupon[]>([]);

  // Payment method state
  type PaymentMethodType = "cod" | "advance";
  type AdvancePaymentType = "bkash" | "nagad";
  type AdvanceAmountType = "delivery" | "half" | "full";
  const [paymentCodEnabled, setPaymentCodEnabled] = useState(true);
  const [paymentAdvanceEnabled, setPaymentAdvanceEnabled] = useState(false);
  const [paymentBkashNumber, setPaymentBkashNumber] = useState("");
  const [paymentNagadNumber, setPaymentNagadNumber] = useState("");
  const [paymentAdvanceType, setPaymentAdvanceType] =
    useState<AdvanceAmountType>("delivery");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodType>("cod");
  const [advancePaymentMethod, setAdvancePaymentMethod] =
    useState<AdvancePaymentType>("bkash");
  const [advancePaymentSenderPhone, setAdvancePaymentSenderPhone] =
    useState("");
  const [advancePaymentTxnId, setAdvancePaymentTxnId] = useState("");

  useEffect(() => {
    setMounted(true);

    // Fetch live delivery charges + store settings
    const fetchConfig = async () => {
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data } = await supabase
          .from("delivery_settings")
          .select("zone, charge")
          .eq("is_active", true);

        if (data) {
          const charges: Record<string, number> = {};
          for (const row of data) {
            charges[row.zone] = row.charge;
          }
          setDeliveryCharges((prev) => ({ ...prev, ...charges }));
        }
      } catch {
        // use defaults
      }

      try {
        const res = await fetch("/api/settings/store");
        if (res.ok) {
          const data = await res.json();
          const areaSettings = readDeliveryAreaSettings(data);
          setDhakaCityAreas(areaSettings.dhakaCityAreas);
          setSubDhakaAreas(areaSettings.subDhakaAreas);

          console.log("🔧 Customization Settings Loaded:", {
            enabled: data.customization_enabled,
            option_paid: data.customization_option_paid_enabled,
            option_whatsapp: data.customization_option_whatsapp_enabled,
            whatsapp_text: data.customization_whatsapp_text,
            whatsapp_number: data.customization_whatsapp_number,
            option_facebook: data.customization_option_facebook_enabled,
            facebook_text: data.customization_facebook_text,
            facebook_link: data.customization_facebook_link,
            requires_advance: data.customization_requires_advance,
          });
          setCustomizationEnabled(data.customization_enabled === "true");
          setCustomizationOptionPaidEnabled(
            data.customization_option_paid_enabled === "true",
          );
          setCustomizationPrice(
            parseFloat(data.customization_price || "0") || 0,
          );
          setCustomizationOptionWhatsappEnabled(
            data.customization_option_whatsapp_enabled === "true",
          );
          setCustomizationWhatsappText(data.customization_whatsapp_text || "");
          setCustomizationWhatsappNumber(
            data.customization_whatsapp_number || "",
          );
          setCustomizationOptionFacebookEnabled(
            data.customization_option_facebook_enabled === "true",
          );
          setCustomizationFacebookText(data.customization_facebook_text || "");
          setCustomizationFacebookLink(data.customization_facebook_link || "");
          // Customization advance payment requirement
          setCustomizationRequiresAdvance(
            data.customization_requires_advance === "true",
          );
          // Payment settings
          const codEnabled = data.payment_cod_enabled !== "false";
          const advanceEnabled = data.payment_advance_enabled === "true";
          setPaymentCodEnabled(codEnabled);
          setPaymentAdvanceEnabled(advanceEnabled);
          setPaymentBkashNumber(data.payment_bkash_number || "");
          setPaymentNagadNumber(data.payment_nagad_number || "");
          setPaymentAdvanceType(
            (data.payment_advance_type as AdvanceAmountType) || "delivery",
          );
          // Set default payment method based on what's enabled
          if (!codEnabled && advanceEnabled) {
            setSelectedPaymentMethod("advance");
          }
        }
      } catch {
        // customization stays disabled
      }

      // Fetch public coupons
      try {
        const res = await fetch("/api/coupons");
        if (res.ok) {
          const data = await res.json();
          setPublicCoupons(data);
        }
      } catch {
        // ignore - coupons are optional
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (mounted && items.length > 0) {
      trackInitiateCheckout({
        content_ids: items.map((i) => i.product.id),
        value: subtotal(),
        currency: "BDT",
        num_items: items.length,
      });
    }
  }, [mounted, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect delivery zone from district + area
  useEffect(() => {
    if (!district) {
      setDeliveryZone("inside_dhaka");
      return;
    }

    setDeliveryZone(
      resolveDeliveryZone({
        district,
        area,
        dhakaCityAreas,
        subDhakaAreas,
      }),
    );
  }, [district, area, dhakaCityAreas, subDhakaAreas]);

  // Count individual jersey units with customization filled in
  const customizedItemsCount = Object.values(customizations).reduce(
    (total, units) =>
      total +
      (units || []).filter((u) => u?.name?.trim() || u?.number?.trim()).length,
    0,
  );

  // Auto-switch to advance payment when customer adds customization and advance is required
  useEffect(() => {
    if (
      customizationOptionPaidEnabled &&
      customizationRequiresAdvance &&
      customizedItemsCount > 0
    ) {
      // Force advance payment for customized orders
      setSelectedPaymentMethod("advance");
    }
  }, [
    customizationOptionPaidEnabled,
    customizationRequiresAdvance,
    customizedItemsCount,
  ]);

  const deliveryCharge = deliveryCharges[deliveryZone] ?? 60;
  const isDhakaDistrict = district === "Dhaka";
  const dhakaCityOptions = Array.from(new Set(dhakaCityAreas));
  const subDhakaOptions = Array.from(new Set(subDhakaAreas)).filter(
    (subArea) => !dhakaCityOptions.includes(subArea),
  );

  // Only charge customization fee if the paid option is enabled
  const customizationTotal = customizationOptionPaidEnabled
    ? customizedItemsCount * customizationPrice
    : 0;

  // Check if customer has any customized items and advance is required
  const hasCustomizedItems = customizedItemsCount > 0;
  const mustPayAdvanceForCustomization =
    customizationOptionPaidEnabled &&
    customizationRequiresAdvance &&
    hasCustomizedItems;

  const discountAmount = appliedCoupon?.discount_amount || 0;
  const total =
    subtotal() + deliveryCharge + customizationTotal - discountAmount;

  // Calculate advance payment amount based on admin settings
  // For customization orders: always 50% of total
  // For regular advance: use admin-configured type
  const advancePaymentAmount = (() => {
    if (mustPayAdvanceForCustomization) {
      // Customization orders always pay 50% advance
      return Math.ceil(total / 2);
    }
    // Regular advance payment settings
    if (paymentAdvanceType === "full") {
      return total;
    } else if (paymentAdvanceType === "half") {
      return Math.ceil(total / 2);
    } else {
      // delivery charge only
      return deliveryCharge;
    }
  })();

  const setCustomization = (
    variantId: string,
    unitIdx: number,
    field: "name" | "number",
    value: string,
  ) => {
    setCustomizations((prev) => {
      const units = prev[variantId] ? [...prev[variantId]] : [];
      const existing = units[unitIdx] || { name: "", number: "" };
      units[unitIdx] = { ...existing, [field]: value };
      return { ...prev, [variantId]: units };
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal: subtotal() }),
      });
      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discount_amount: data.discount_amount,
          description: data.coupon.description,
        });
        toast.success(
          `Coupon applied! You save ${formatPrice(data.discount_amount)}`,
        );
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!validateBDPhone(phone)) {
      newErrors.phone = "Enter a valid Bangladeshi phone (01XXXXXXXXX)";
    }
    if (!district) newErrors.district = "District is required";
    if (district === "Dhaka" && !area.trim()) {
      newErrors.area =
        "City/Area is required for Dhaka district to calculate delivery charge";
    }
    if (!address.trim()) newErrors.address = "Address is required";

    // Validate advance payment details
    // Required when: regular advance payment is selected OR customization requires advance
    if (
      (selectedPaymentMethod === "advance" && paymentAdvanceEnabled) ||
      mustPayAdvanceForCustomization
    ) {
      if (!advancePaymentSenderPhone.trim()) {
        newErrors.advance_payment = "Sender phone number is required";
      } else if (!validateBDPhone(advancePaymentSenderPhone)) {
        newErrors.advance_payment =
          "Enter a valid Bangladeshi phone (01XXXXXXXXX)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: normalizePhone(phone),
          customer_email: email.trim() || null,
          district,
          area: area.trim() || null,
          address: address.trim(),
          notes: notes.trim() || null,
          customization_total: customizationTotal,
          coupon_code: appliedCoupon?.code || null,
          // Payment method fields
          // Force advance when customization requires it
          payment_method: mustPayAdvanceForCustomization
            ? "advance"
            : selectedPaymentMethod,
          advance_payment_method:
            selectedPaymentMethod === "advance" ||
            mustPayAdvanceForCustomization
              ? advancePaymentMethod
              : null,
          advance_payment_sender_phone:
            selectedPaymentMethod === "advance" ||
            mustPayAdvanceForCustomization
              ? normalizePhone(advancePaymentSenderPhone)
              : null,
          advance_payment_txn_id:
            selectedPaymentMethod === "advance" ||
            mustPayAdvanceForCustomization
              ? advancePaymentTxnId.trim() || null
              : null,
          advance_payment_amount:
            selectedPaymentMethod === "advance" ||
            mustPayAdvanceForCustomization
              ? advancePaymentAmount
              : 0,
          items: items.map((i) => {
            const units = customizations[i.variant.id] || [];
            const filledUnits = units
              .map((u, idx) => ({ u, idx }))
              .filter(({ u }) => u?.name?.trim() || u?.number?.trim());
            const custNote =
              filledUnits.length === 0
                ? null
                : filledUnits.length === 1 && i.quantity === 1
                  ? `Name: ${filledUnits[0].u.name.trim() || "-"}, Number: ${filledUnits[0].u.number.trim() || "-"}`
                  : filledUnits
                      .map(
                        ({ u, idx }) =>
                          `Jersey ${idx + 1}: Name: ${u.name.trim() || "-"}, Number: ${u.number.trim() || "-"}`,
                      )
                      .join(" | ");
            return {
              product_id: i.product.id,
              variant_id: i.variant.id,
              product_name: i.product.name,
              variant_size: i.variant.size,
              variant_color: i.variant.color,
              variant_attributes: i.variant.attributes || null,
              quantity: i.quantity,
              unit_price: i.variant.discount_price ?? i.variant.sale_price,
              cost_price: i.variant.cost_price,
              customization_note: custNote,
            };
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      clearCart();
      router.push(`/thank-you/${data.order_number}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const zoneLabel = (zone: DeliveryZone) => {
    switch (zone) {
      case "inside_dhaka":
        return "Dhaka City";
      case "sub_dhaka":
        return "Sub Dhaka Zone";
      case "outside_dhaka":
        return "Outside Dhaka";
    }
  };

  const zoneEstDays = (zone: DeliveryZone) => {
    switch (zone) {
      case "inside_dhaka":
        return "1-2 business days";
      case "sub_dhaka":
        return "1-3 business days";
      case "outside_dhaka":
        return "2-4 business days";
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="size-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-4">
          Add some products to your cart before checking out.
        </p>
        <Button asChild>
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>
                  District <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={district}
                  onValueChange={(value) => {
                    setDistrict(value);
                    setArea("");
                  }}
                >
                  <SelectTrigger
                    className={errors.district ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {BD_ALL_DISTRICTS.map((districtName) => (
                      <SelectItem key={districtName} value={districtName}>
                        {districtName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {errors.district}
                  </p>
                )}
              </div>

              {isDhakaDistrict ? (
                <div>
                  <Label>
                    City / Area <span className="text-destructive">*</span>
                  </Label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger
                      className={errors.area ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select Dhaka city or sub-dhaka area" />
                    </SelectTrigger>
                    <SelectContent>
                      {dhakaCityOptions.map((areaName) => (
                        <SelectItem key={`inside-${areaName}`} value={areaName}>
                          {areaName}
                        </SelectItem>
                      ))}
                      {subDhakaOptions.map((areaName) => (
                        <SelectItem key={`sub-${areaName}`} value={areaName}>
                          {areaName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dhaka city areas use Inside Dhaka charge. Sub-dhaka areas
                    use Sub Dhaka charge.
                  </p>
                  {errors.area && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.area}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="area">Area / Thana (Optional)</Label>
                  <Input
                    id="area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Sadar, Station Road"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="address">
                  Full Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House, Road, Street details..."
                  rows={3}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {errors.address}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delivery Info */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      Home Delivery — {zoneLabel(deliveryZone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {zoneEstDays(deliveryZone)}
                    </p>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatPrice(deliveryCharge)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              {mustPayAdvanceForCustomization ? (
                // Customization requires advance - show notice and force advance payment
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border-2 border-amber-300 bg-amber-50">
                    <p className="font-medium text-sm text-amber-800 flex items-center gap-2">
                      ⚠️ Advance Payment Required for Customized Orders
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Since you have customized jerseys with name/number, you
                      need to pay <strong>50% advance</strong> (
                      {formatPrice(advancePaymentAmount)}) via bKash/Nagad.
                    </p>
                  </div>
                </div>
              ) : paymentCodEnabled && paymentAdvanceEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select Payment Method</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* COD Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("cod")}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedPaymentMethod === "cod"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-sm">💵 Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">
                        Pay when you receive your order
                      </p>
                    </button>

                    {/* Advance Payment Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("advance")}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedPaymentMethod === "advance"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-sm">📱 Advance Payment</p>
                      <p className="text-xs text-muted-foreground">
                        Pay delivery charge via bKash/Nagad
                      </p>
                    </button>
                  </div>
                </div>
              ) : paymentCodEnabled ? (
                <p className="text-xs text-muted-foreground">
                  💵 Cash on Delivery — Pay when you receive your order
                </p>
              ) : paymentAdvanceEnabled ? (
                <p className="text-xs text-muted-foreground">
                  📱 Advance Payment Required — Pay delivery charge via
                  bKash/Nagad
                </p>
              ) : null}

              {/* Advance Payment Details */}
              {((selectedPaymentMethod === "advance" &&
                paymentAdvanceEnabled) ||
                mustPayAdvanceForCustomization) && (
                <div className="p-4 rounded-lg border-2 border-pink-200 bg-pink-50/50 space-y-4">
                  <div>
                    <p className="font-medium text-sm mb-2">
                      Send{" "}
                      {mustPayAdvanceForCustomization
                        ? "50% Advance"
                        : paymentAdvanceType === "full"
                          ? "Full Amount"
                          : paymentAdvanceType === "half"
                            ? "Half Payment"
                            : "Delivery Charge"}{" "}
                      ({formatPrice(advancePaymentAmount)}) to:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {paymentBkashNumber && (
                        <button
                          type="button"
                          onClick={() => setAdvancePaymentMethod("bkash")}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            advancePaymentMethod === "bkash"
                              ? "border-pink-500 bg-pink-100"
                              : "border-pink-200 hover:border-pink-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src="/bkash.svg"
                              alt="bKash"
                              className="w-6 h-6 object-contain"
                            />
                            <span className="font-semibold">bKash</span>
                          </div>
                          <p className="text-lg font-mono mt-1">
                            {paymentBkashNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Send Money
                          </p>
                        </button>
                      )}

                      {paymentNagadNumber && (
                        <button
                          type="button"
                          onClick={() => setAdvancePaymentMethod("nagad")}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            advancePaymentMethod === "nagad"
                              ? "border-orange-500 bg-orange-100"
                              : "border-orange-200 hover:border-orange-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src="/nagad.png"
                              alt="Nagad"
                              className="w-6 h-6 object-contain"
                            />
                            <span className="font-semibold">Nagad</span>
                          </div>
                          <p className="text-lg font-mono mt-1">
                            {paymentNagadNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Send Money
                          </p>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      After sending money, enter your details:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="sender_phone">
                          Sender Phone Number *
                        </Label>
                        <Input
                          id="sender_phone"
                          value={advancePaymentSenderPhone}
                          onChange={(e) =>
                            setAdvancePaymentSenderPhone(e.target.value)
                          }
                          placeholder="e.g. 01XXXXXXXXX"
                          className="bg-white"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Phone number you sent money from
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="txn_id">
                          Transaction ID (Optional)
                        </Label>
                        <Input
                          id="txn_id"
                          value={advancePaymentTxnId}
                          onChange={(e) =>
                            setAdvancePaymentTxnId(e.target.value)
                          }
                          placeholder="e.g. TXN123456"
                          className="bg-white"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Transaction ID from confirmation SMS
                        </p>
                      </div>
                    </div>
                  </div>

                  {errors.advance_payment && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="size-4" />
                      {errors.advance_payment}
                    </p>
                  )}

                  {/* Remaining COD info */}
                  {total - advancePaymentAmount > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">
                          Remaining to pay on delivery:
                        </span>{" "}
                        {formatPrice(total - advancePaymentAmount)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coupon Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="size-5" />
                Coupon Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">
                      {appliedCoupon.code}
                    </p>
                    {appliedCoupon.description && (
                      <p className="text-sm text-green-600">
                        {appliedCoupon.description}
                      </p>
                    )}
                    <p className="text-sm text-green-700">
                      You save {formatPrice(appliedCoupon.discount_amount)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      className={couponError ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-sm text-destructive">{couponError}</p>
                  )}

                  {/* Available Public Coupons */}
                  {publicCoupons.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        Available coupons:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {publicCoupons.map((coupon) => (
                          <Badge
                            key={coupon.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => setCouponCode(coupon.code)}
                          >
                            {coupon.code}
                            {coupon.discount_type === "percentage"
                              ? ` - ${coupon.discount_value}% off`
                              : ` - ${formatPrice(coupon.discount_value)} off`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Jersey Customization */}
          {customizationEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shirt className="size-5" />
                  Jersey Customization (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Option 1: Paid Customization with Input Fields */}
                {customizationOptionPaidEnabled && (
                  <div className="border-l-4 border-primary/30 pl-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Enter name &amp; number directly. Extra{" "}
                      <span className="font-semibold text-primary">
                        {formatPrice(customizationPrice)}
                      </span>{" "}
                      per jersey. Leave blank to skip.
                    </p>
                    {items.map((item) => (
                      <div
                        key={item.variant.id}
                        className="border rounded-lg p-3 space-y-3 mb-3"
                      >
                        {/* Product header */}
                        <div className="flex items-center gap-2">
                          {item.image_url && (
                            <div className="relative size-10 rounded overflow-hidden bg-muted shrink-0">
                              <Image
                                src={item.image_url}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatVariantShort(
                                item.variant.size,
                                item.variant.attributes,
                              )}{" "}
                              — {item.quantity} jersey
                              {item.quantity > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* One row per jersey unit */}
                        {Array.from({ length: item.quantity }, (_, unitIdx) => (
                          <div key={unitIdx} className="space-y-1">
                            {item.quantity > 1 && (
                              <p className="text-xs font-medium text-muted-foreground">
                                Jersey {unitIdx + 1}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Player Name</Label>
                                <Input
                                  placeholder="e.g. MESSI"
                                  value={
                                    customizations[item.variant.id]?.[unitIdx]
                                      ?.name || ""
                                  }
                                  onChange={(e) =>
                                    setCustomization(
                                      item.variant.id,
                                      unitIdx,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm mt-0.5"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Jersey Number</Label>
                                <Input
                                  placeholder="e.g. 10"
                                  value={
                                    customizations[item.variant.id]?.[unitIdx]
                                      ?.number || ""
                                  }
                                  onChange={(e) =>
                                    setCustomization(
                                      item.variant.id,
                                      unitIdx,
                                      "number",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm mt-0.5"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Option 2: WhatsApp Contact */}
                {customizationOptionWhatsappEnabled && (
                  <div className="border-l-4 border-green-500/30 pl-4 bg-green-50/50 dark:bg-green-950/20 rounded-r-lg p-3">
                    <p className="text-sm mb-2">{customizationWhatsappText}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={() => {
                        const url = `https://wa.me/${customizationWhatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I want to customize my jersey order.")}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <svg
                        className="size-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      Contact on WhatsApp
                    </Button>
                  </div>
                )}

                {/* Option 3: Facebook Contact */}
                {customizationOptionFacebookEnabled && (
                  <div className="border-l-4 border-blue-500/30 pl-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg p-3">
                    <p className="text-sm mb-2">{customizationFacebookText}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                      onClick={() => {
                        window.open(customizationFacebookLink, "_blank");
                      }}
                    >
                      <svg
                        className="size-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Message on Facebook
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right - Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const price =
                  item.variant.discount_price ?? item.variant.sale_price;
                const units = customizations[item.variant.id] || [];
                const custLines = units
                  .map((u, idx) =>
                    u?.name?.trim() || u?.number?.trim()
                      ? item.quantity > 1
                        ? `Jersey ${idx + 1}: ${u.name.trim() || "-"} #${u.number.trim() || "-"}`
                        : `${u.name.trim() || "-"} #${u.number.trim() || "-"}`
                      : null,
                  )
                  .filter(Boolean);
                return (
                  <div key={item.variant.id} className="flex gap-3">
                    {item.image_url && (
                      <div className="relative size-14 rounded-md overflow-hidden bg-muted shrink-0">
                        <Image
                          src={item.image_url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatVariantShort(
                          item.variant.size,
                          item.variant.attributes,
                        )}{" "}
                        × {item.quantity}
                      </p>
                      {custLines.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {custLines.map((line, i) => (
                            <p key={i} className="text-xs text-primary">
                              ✂️ {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatPrice(price * item.quantity)}
                    </span>
                  </div>
                );
              })}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal())}</span>
                </div>
                {customizationTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Customization ({customizedItemsCount} jersey
                      {customizedItemsCount > 1 ? "s" : ""})
                    </span>
                    <span>{formatPrice(customizationTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatPrice(deliveryCharge)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>Confirm Order — {formatPrice(total)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
