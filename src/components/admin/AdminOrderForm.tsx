"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader2, AlertCircle, Plus, Trash2, UserCheck, Building2, Search, X } from "lucide-react";
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
import { toast } from "sonner";
import type { Product } from "@/types";

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

type Platform = "facebook" | "instagram" | "tiktok" | "whatsapp" | "cell_phone";

interface JerseyCustomization {
  name: string;
  number: string;
  note: string;
}

interface OrderItemForm {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_size: string;
  variant_color: string | null;
  variant_attributes: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  customization_note: string | null;
  jersey_name: string;
  jersey_number: string;
  jersey_customizations: JerseyCustomization[];
}

export function AdminOrderForm() {
  const router = useRouter();
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
  const [platform, setPlatform] = useState<Platform>("cell_phone");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "online" | "advance"
  >("cod");
  const [paymentDetails, setPaymentDetails] = useState("");
  // Advance payment specific state
  const [advancePaymentChannel, setAdvancePaymentChannel] = useState<
    "bkash" | "nagad" | "bank"
  >("bkash");
  const [advancePaidAmount, setAdvancePaidAmount] = useState("");
  const [advanceSenderPhone, setAdvanceSenderPhone] = useState("");
  const [advanceTxnId, setAdvanceTxnId] = useState("");
  const [advancePaymentStatus, setAdvancePaymentStatus] = useState<
    "unpaid" | "partial" | "paid"
  >("unpaid");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Order items
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Delivery charges
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [deliveryCharges, setDeliveryCharges] = useState<
    Record<string, number>
  >({
    inside_dhaka: 60,
    sub_dhaka: 80,
    outside_dhaka: 120,
  });

  useEffect(() => {
    setMounted(true);

    // Fetch delivery charges
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

        const storeRes = await fetch("/api/settings/store");
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const areaSettings = readDeliveryAreaSettings(storeData);
          setDhakaCityAreas(areaSettings.dhakaCityAreas);
          setSubDhakaAreas(areaSettings.subDhakaAreas);
        }
      } catch {
        // use defaults
      }
    };

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch("/api/products?limit=200");
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchConfig();
    fetchProducts();

    // Fetch team members (moderators + managers) for "Recommended By"
    const fetchTeamMembers = async () => {
      setLoadingTeam(true);
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data
            .filter((u: TeamMember) =>
              ["moderator", "manager"].includes(u.role),
            )
            .sort((a: TeamMember, b: TeamMember) =>
              a.full_name.localeCompare(b.full_name),
            );
          setTeamMembers(filtered);
        }
      } catch {
        // ignore
      } finally {
        setLoadingTeam(false);
      }
    };
    fetchTeamMembers();
  }, []);

  // Auto-detect delivery zone
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

  const autoDeliveryCharge = deliveryCharges[deliveryZone] ?? 60;
  // Allow admin to override the auto-calculated delivery charge
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState<string>("");

  // Sync customDeliveryCharge when zone/charges change (only if not manually edited)
  useEffect(() => {
    setCustomDeliveryCharge(String(deliveryCharges[deliveryZone] ?? 60));
  }, [deliveryZone, deliveryCharges]);

  const deliveryCharge =
    customDeliveryCharge !== ""
      ? parseFloat(customDeliveryCharge) || 0
      : autoDeliveryCharge;
  const isDhakaDistrict = district === "Dhaka";
  const dhakaCityOptions = Array.from(new Set(dhakaCityAreas));
  const subDhakaOptions = Array.from(new Set(subDhakaAreas)).filter(
    (subArea) => !dhakaCityOptions.includes(subArea),
  );

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  const perJerseyCustomizationPrice = 250;
  const customizationCount = orderItems.reduce((sum, item) => {
    const filled = (item.jersey_customizations || []).filter(
      (x) => x?.name?.trim() || x?.number?.trim() || x?.note?.trim(),
    ).length;
    return sum + filled;
  }, 0);
  const customizationCharge = customizationCount * perJerseyCustomizationPrice;
  const total = subtotal + deliveryCharge + customizationCharge;

  const normalizedSearch = productSearch.trim().toLowerCase();
  const filteredProducts = normalizedSearch
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.team?.toLowerCase().includes(normalizedSearch) ||
          product.league?.toLowerCase().includes(normalizedSearch),
      )
    : products;

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
    if (orderItems.length === 0)
      newErrors.items = "At least one item is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Map advance payment status
      const deliveryPaymentStatusMap = {
        unpaid: "pending",
        partial: "paid",
        paid: "verified",
      } as const;

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: normalizePhone(phone),
          customer_email: email.trim() || null,
          district,
          area: area.trim() || null,
          address: address.trim(),
          delivery_zone: deliveryZone,
          delivery_charge_override: deliveryCharge,
          notes: notes.trim() || null,
          platform,
          payment_method: paymentMethod,
          payment_details:
            paymentMethod === "online" ? paymentDetails.trim() : null,
          // Advance payment fields
          advance_payment_method:
            paymentMethod === "advance" ? advancePaymentChannel : null,
          advance_payment_amount:
            paymentMethod === "advance"
              ? parseFloat(advancePaidAmount) || 0
              : 0,
          advance_payment_sender_phone:
            paymentMethod === "advance" ? advanceSenderPhone.trim() || null : null,
          advance_payment_txn_id:
            paymentMethod === "advance" ? advanceTxnId.trim() || null : null,
          delivery_payment_status:
            paymentMethod === "advance"
              ? deliveryPaymentStatusMap[advancePaymentStatus]
              : "pending",
          items: orderItems.map((item) => {
            const customNote = item.customization_note?.trim();
            const jerseyName = item.jersey_name?.trim();
            const jerseyNumber = item.jersey_number?.trim();

            const perJerseyNotes = (item.jersey_customizations || [])
              .map((jc, idx) => {
                const name = jc.name?.trim();
                const number = jc.number?.trim();
                const note = jc.note?.trim();
                if (!name && !number && !note) return "";

                const parts: string[] = [];
                if (name) parts.push(`Name: ${name}`);
                if (number) parts.push(`Number: ${number}`);
                if (note) parts.push(`Note: ${note}`);

                return `Jersey ${idx + 1}: ${parts.join(", ")}`;
              })
              .filter(Boolean);

            const fallbackJerseyNote =
              !customNote && (jerseyName || jerseyNumber)
                ? [
                    jerseyName ? `Name: ${jerseyName}` : null,
                    jerseyNumber ? `Number: ${jerseyNumber}` : null,
                  ]
                    .filter(Boolean)
                    .join("; ")
                : null;

            return {
              ...item,
              customization_note:
                customNote ||
                (perJerseyNotes.length > 0
                  ? perJerseyNotes.join(" | ")
                  : null) ||
                fallbackJerseyNote ||
                null,
            };
          }),
          recommended_by_profile_id:
            recommendedBy && recommendedBy !== "none" ? recommendedBy : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      toast.success("Order created successfully!");
      router.push("/admin/orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: "",
        variant_id: "",
        product_name: "",
        variant_size: "",
        variant_color: null,
        variant_attributes: null,
        quantity: 1,
        unit_price: 0,
        cost_price: 0,
        customization_note: null,
        jersey_name: "",
        jersey_number: "",
        jersey_customizations: [{ name: "", number: "", note: "" }],
      },
    ]);
  };

  const addOrderItemFromProduct = (product: Product) => {
    const firstVariant = product.variants?.[0];
    setOrderItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        variant_id: firstVariant?.id || "",
        variant_size: firstVariant?.size || "",
        variant_color: firstVariant?.color || null,
        variant_attributes: firstVariant?.attributes || null,
        quantity: 1,
        unit_price:
          firstVariant?.discount_price ?? firstVariant?.sale_price ?? 0,
        cost_price: firstVariant?.cost_price ?? 0,
        customization_note: null,
        jersey_name: "",
        jersey_number: "",
        jersey_customizations: [{ name: "", number: "", note: "" }],
      },
    ]);
    // Close drawer and reset search after adding
    setDrawerOpen(false);
    setProductSearch("");
  };

  const setProductForItem = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...orderItems];

    if (!product) {
      updated[index] = {
        ...updated[index],
        product_id: "",
        variant_id: "",
        product_name: "",
        variant_size: "",
        variant_color: null,
        variant_attributes: null,
        unit_price: 0,
        cost_price: 0,
        jersey_customizations: [{ name: "", number: "", note: "" }],
      };
    } else {
      const firstVariant = product.variants?.[0];
      const effectivePrice =
        firstVariant?.discount_price ?? firstVariant?.sale_price ?? 0;
      updated[index] = {
        ...updated[index],
        product_id: product.id,
        product_name: product.name,
        variant_id: firstVariant?.id || "",
        variant_size: firstVariant?.size || "",
        variant_color: firstVariant?.color || null,
        variant_attributes: firstVariant?.attributes || null,
        unit_price: effectivePrice,
        cost_price: firstVariant?.cost_price || 0,
        jersey_customizations:
          updated[index].jersey_customizations?.length > 0
            ? updated[index].jersey_customizations
            : [{ name: "", number: "", note: "" }],
      };
    }

    setOrderItems(updated);
  };

  const setVariantForItem = (index: number, variantId: string) => {
    const item = orderItems[index];
    const product = products.find((p) => p.id === item.product_id);
    const variant = product?.variants?.find((v) => v.id === variantId);
    if (!variant) return;

    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      variant_id: variant.id,
      variant_size: variant.size,
      variant_color: variant.color,
      variant_attributes: variant.attributes || null,
      unit_price: variant.discount_price ?? variant.sale_price,
      cost_price: variant.cost_price,
      jersey_customizations:
        updated[index].jersey_customizations?.length > 0
          ? updated[index].jersey_customizations
          : [{ name: "", number: "", note: "" }],
    };
    setOrderItems(updated);
  };

  const updateOrderItem = <K extends keyof OrderItemForm>(
    index: number,
    field: K,
    value: OrderItemForm[K],
  ) => {
    const updated = [...orderItems];
    const item = { ...updated[index] };

    if (field === "quantity") {
      const quantity = Number(value) || 1;
      item.quantity = quantity;
      const existingCustoms = item.jersey_customizations || [];
      if (existingCustoms.length < quantity) {
        item.jersey_customizations = [
          ...existingCustoms,
          ...Array.from({ length: quantity - existingCustoms.length }, () => ({
            name: "",
            number: "",
            note: "",
          })),
        ];
      } else {
        item.jersey_customizations = existingCustoms.slice(0, quantity);
      }
    } else {
      // Type-safe field update
      (item as Record<keyof OrderItemForm, unknown>)[field] = value;
    }

    updated[index] = item;
    setOrderItems(updated);
  };

  const setJerseyCustomization = (
    itemIndex: number,
    jerseyIndex: number,
    key: keyof JerseyCustomization,
    value: string,
  ) => {
    const updated = [...orderItems];
    const item = { ...updated[itemIndex] };
    const customs = item.jersey_customizations || [];
    const updatedCustoms = [...customs];
    updatedCustoms[jerseyIndex] = {
      ...updatedCustoms[jerseyIndex],
      [key]: value,
    };
    item.jersey_customizations = updatedCustoms;
    updated[itemIndex] = item;
    setOrderItems(updated);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  if (!mounted) return null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Customer Info & Items */}
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
                  placeholder="Customer full name"
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
                    placeholder="customer@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="platform">
                  Order Platform <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={platform}
                  onValueChange={(value: Platform) => setPlatform(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="cell_phone">Cell Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recommended By */}
              {(teamMembers.length > 0 || loadingTeam) && (
                <div>
                  <Label
                    htmlFor="recommendedBy"
                    className="flex items-center gap-1.5"
                  >
                    <UserCheck className="size-3.5 text-muted-foreground" />
                    Recommended By (Optional)
                  </Label>
                  <Select
                    value={recommendedBy}
                    onValueChange={setRecommendedBy}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingTeam ? "Loading team..." : "Select team member"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                          <span className="text-muted-foreground ml-1 text-xs capitalize">
                            ({member.role})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Who referred or sent this order data?
                  </p>
                </div>
              )}
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

              <div>
                <Label htmlFor="shippingCharge">
                  Shipping Charge <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shippingCharge"
                  type="number"
                  min="0"
                  step="1"
                  value={customDeliveryCharge}
                  onChange={(e) => setCustomDeliveryCharge(e.target.value)}
                  placeholder={String(autoDeliveryCharge)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-filled from delivery zone. You can override it.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ─── Payment Information ─── */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Information</CardTitle>
              <p className="text-xs text-muted-foreground">Enter payment details</p>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentMethod">
                        Payment Method <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value: "cod" | "online" | "advance") => {
                          setPaymentMethod(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cod">Cash on Delivery</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                          <SelectItem value="advance">Advance Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Payment Status</Label>
                      <Select
                        value={advancePaymentStatus}
                        onValueChange={(v: "unpaid" | "partial" | "paid") =>
                          setAdvancePaymentStatus(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Online payment details */}
                  {paymentMethod === "online" && (
                    <div>
                      <Label htmlFor="paymentDetails">Payment Details (Optional)</Label>
                      <Input
                        id="paymentDetails"
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        placeholder="e.g., bKash, Nagad, Bank Transfer"
                      />
                    </div>
                  )}

                  {/* Advance payment details */}
                  {paymentMethod === "advance" && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 p-4 space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Payment Channel</Label>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {/* bKash */}
                          <button
                            type="button"
                            onClick={() => setAdvancePaymentChannel("bkash")}
                            className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                              advancePaymentChannel === "bkash"
                                ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30"
                                : "border-border bg-background hover:border-pink-300"
                            }`}
                          >
                            <img
                              src="/bkash.svg"
                              alt="bKash"
                              className="h-7 w-auto object-contain"
                            />
                            <span className="text-xs font-medium">bKash</span>
                          </button>

                          {/* Nagad */}
                          <button
                            type="button"
                            onClick={() => setAdvancePaymentChannel("nagad")}
                            className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                              advancePaymentChannel === "nagad"
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                : "border-border bg-background hover:border-orange-300"
                            }`}
                          >
                            <img
                              src="/nagad.png"
                              alt="Nagad"
                              className="h-7 w-auto object-contain"
                            />
                            <span className="text-xs font-medium">Nagad</span>
                          </button>

                          {/* Bank */}
                          <button
                            type="button"
                            onClick={() => setAdvancePaymentChannel("bank")}
                            className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                              advancePaymentChannel === "bank"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                : "border-border bg-background hover:border-blue-300"
                            }`}
                          >
                            <Building2 className="h-7 w-7 text-blue-600" />
                            <span className="text-xs font-medium">Bank</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="advancePaidAmount">
                            Paid Amount <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="advancePaidAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={advancePaidAmount}
                            onChange={(e) => setAdvancePaidAmount(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="advanceSenderPhone">Sender Phone (Optional)</Label>
                          <Input
                            id="advanceSenderPhone"
                            value={advanceSenderPhone}
                            onChange={(e) => setAdvanceSenderPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div className="col-span-full">
                          <Label htmlFor="advanceTxnId">Transaction ID (Optional)</Label>
                          <Input
                            id="advanceTxnId"
                            value={advanceTxnId}
                            onChange={(e) => setAdvanceTxnId(e.target.value)}
                            placeholder="e.g. TXN123456"
                          />
                        </div>
                      </div>

                      {/* Payment Summary */}
                      {(() => {
                        const paidAmt = parseFloat(advancePaidAmount) || 0;
                        const dueOnDelivery = Math.max(0, total - paidAmt);
                        return (
                          <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                              <span>Total Order</span>
                              <span className="font-medium">৳{total.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                              <span>Paid</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {paidAmt > 0 ? `– ৳${paidAmt.toLocaleString()}` : "৳0"}
                              </span>
                            </div>
                            <div className="h-px bg-blue-200 dark:bg-blue-800" />
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-800 dark:text-blue-200">Due on Delivery</span>
                              <span className="font-bold text-orange-500 text-base">
                                ৳{dueOnDelivery.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

          {/* Order Items */}
          <Drawer
            open={drawerOpen}
            onOpenChange={(open) => {
              setDrawerOpen(open);
              if (!open) setProductSearch("");
            }}
            direction="bottom"
          >
            <DrawerContent className="max-h-[85vh] flex flex-col">
              <DrawerHeader className="pb-2 border-b">
                <DrawerTitle className="text-base font-semibold">Add Product to Order</DrawerTitle>
              </DrawerHeader>

              {/* Search input */}
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 pr-9 border-primary/40 focus-visible:ring-primary/30"
                    autoFocus
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Product list */}
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    {productSearch ? `No products matching "${productSearch}"` : "No products available."}
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredProducts.map((product) => {
                      const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
                      const firstVariant = product.variants?.[0];
                      const price = firstVariant?.discount_price ?? firstVariant?.sale_price ?? 0;
                      const label =
                        product.category?.name ||
                        product.team ||
                        product.brand ||
                        product.league ||
                        "";

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addOrderItemFromProduct(product)}
                          className="w-full flex items-center gap-3 py-3 px-1 hover:bg-accent/50 transition-colors text-left rounded-sm"
                        >
                          {/* Product image */}
                          <div className="shrink-0 size-14 rounded-md border border-border overflow-hidden bg-muted">
                            {primaryImage?.url ? (
                              <img
                                src={primaryImage.url}
                                alt={primaryImage.alt_text || product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No img
                              </div>
                            )}
                          </div>

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2">{product.name}</p>
                            {label && (
                              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                            )}
                          </div>

                          {/* Price */}
                          <span className="shrink-0 font-semibold text-sm text-primary">
                            ৳{price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Jersey Customization (Optional): each jersey can have a
                    different name &amp; number. Extra ৳250 per jersey. Leave blank
                    to skip. We&apos;ll confirm via WhatsApp.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No items added yet. Click Add Item to start.
                </p>
              ) : (
                orderItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="col-span-full">
                        <Label>Product</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(value: string) =>
                            setProductForItem(index, value)
                          }
                        >
                          <SelectTrigger className="w-full truncate">
                            <SelectValue
                              placeholder={
                                loadingProducts
                                  ? "Loading products..."
                                  : "Select product"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.length === 0 ? (
                              <SelectItem value="no-products" disabled>
                                No products match search
                              </SelectItem>
                            ) : (
                              filteredProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-full">
                        <Label>Variant</Label>
                        <Select
                          value={item.variant_id}
                          onValueChange={(value: string) =>
                            setVariantForItem(index, value)
                          }
                          disabled={!item.product_id || !products.length}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .find((p) => p.id === item.product_id)
                              ?.variants?.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.size}
                                  {variant.color ? ` / ${variant.color}` : ""}
                                  {` — ${formatPrice(
                                    variant.discount_price ??
                                      variant.sale_price,
                                  )}`}
                                </SelectItem>
                              )) || (
                              <SelectItem value="no-variants" disabled>
                                No variants
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "unit_price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-full">
                        <Label className="text-sm font-semibold">
                          Per-jersey customizations (Optional)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Each jersey can have a different name, number and
                          note. Extra ৳250 per jersey(s) filled. Leave blank to
                          skip.
                        </p>

                        {(item.jersey_customizations || []).map(
                          (jersey, jerseyIdx) => (
                            <div
                              key={`jersey-custom-${index}-${jerseyIdx}`}
                              className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
                            >
                              {item.quantity > 1 && (
                                <p className="text-xs text-muted-foreground col-span-full">
                                  Jersey {jerseyIdx + 1}
                                </p>
                              )}

                              <div>
                                <Label className="text-xs">Player Name</Label>
                                <Input
                                  placeholder="e.g. MESSI"
                                  value={jersey.name}
                                  onChange={(e) =>
                                    setJerseyCustomization(
                                      index,
                                      jerseyIdx,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Jersey Number</Label>
                                <Input
                                  placeholder="e.g. 10"
                                  value={jersey.number}
                                  onChange={(e) =>
                                    setJerseyCustomization(
                                      index,
                                      jerseyIdx,
                                      "number",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-full">
                                <Label className="text-xs">
                                  Customization Note
                                </Label>
                                <Input
                                  placeholder="e.g. Add 2026 championship patch"
                                  value={jersey.note}
                                  onChange={(e) =>
                                    setJerseyCustomization(
                                      index,
                                      jerseyIdx,
                                      "note",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      <div>
                        <Label>Manual Size (Fallback)</Label>
                        <Input
                          value={item.variant_size}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "variant_size",
                              e.target.value,
                            )
                          }
                          placeholder="M, L, XL"
                        />
                      </div>

                      <div>
                        <Label>Color (Optional)</Label>
                        <Input
                          value={item.variant_color || ""}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "variant_color",
                              e.target.value,
                            )
                          }
                          placeholder="Red, Blue"
                        />
                      </div>

                      <div>
                        <Label>Cost Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.cost_price}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "cost_price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              {errors.items && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" /> {errors.items}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right - Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product_name || "Unnamed Product"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatVariantShort(
                        item.variant_size,
                        item.variant_attributes,
                      )}{" "}
                      × {item.quantity}
                      {item.variant_color && ` (${item.variant_color})`}
                    </p>
                    {((item.jersey_customizations || []).some(
                      (jc) =>
                        jc?.name?.trim() ||
                        jc?.number?.trim() ||
                        jc?.note?.trim(),
                    ) ||
                      item.customization_note) && (
                      <p className="text-xs text-primary">
                        ✂️{" "}
                        {item.customization_note ||
                          (item.jersey_customizations || [])
                            .map((jc, idx) => {
                              const name = jc.name?.trim();
                              const number = jc.number?.trim();
                              const note = jc.note?.trim();
                              if (!name && !number && !note) return "";
                              const parts: string[] = [];
                              if (name) parts.push(`Name: ${name}`);
                              if (number) parts.push(`Number: ${number}`);
                              if (note) parts.push(`Note: ${note}`);
                              return `Jersey ${idx + 1}: ${parts.join(", ")}`;
                            })
                            .filter(Boolean)
                            .join(" | ")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}

              {orderItems.length > 0 && (
                <>
                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>{formatPrice(deliveryCharge)}</span>
                    </div>
                    {customizationCount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          Customization ({customizationCount} item
                          {customizationCount > 1 ? "s" : ""})
                        </span>
                        <span>{formatPrice(customizationCharge)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>Create Order — {formatPrice(total)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
