"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Truck,
  Package,
  MapPin,
  User,
  Phone,
  FileText,
  Scale,
  Hash,
  Banknote,
  StickyNote,
  Store,
  AlertCircle,
  CheckCircle2,
  Zap,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import type { Order } from "@/types";
import type {
  CourierProvider,
  PathaoCity,
  PathaoZone,
  PathaoArea,
  PathaoStore,
} from "@/lib/courier/types";

interface CourierFormProps {
  order: Order;
  onSuccess: () => void;
}

export function CourierForm({ order, onSuccess }: CourierFormProps) {
  // Provider selection
  const [provider, setProvider] = useState<CourierProvider>("steadfast");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pathao specific
  const [cities, setCities] = useState<PathaoCity[]>([]);
  const [zones, setZones] = useState<PathaoZone[]>([]);
  const [areas, setAreas] = useState<PathaoArea[]>([]);
  const [stores, setStores] = useState<PathaoStore[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    // Pathao fields
    store_id: "",
    city_id: "",
    zone_id: "",
    area_id: "",
    // Common fields
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: order.address,
    delivery_type: "standard",
    item_weight: "0.5",
    item_quantity: String(
      order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
    ),
    amount_to_collect: String(order.total),
    special_instruction: order.notes || "",
    item_description:
      order.items
        ?.map((i) => `${i.product_name} (${i.variant_size})`)
        .join(", ") || "",
  });

  // Fetch initial data based on provider
  useEffect(() => {
    if (provider === "pathao") {
      setApiError(null);
      fetchPathaoCities();
      fetchPathaoStores();
    }
  }, [provider]);

  // Fetch Pathao zones when city changes
  useEffect(() => {
    if (formData.city_id && provider === "pathao") {
      fetchPathaoZones(formData.city_id);
    }
  }, [formData.city_id, provider]);

  // Fetch Pathao areas when zone changes
  useEffect(() => {
    if (formData.zone_id && provider === "pathao") {
      fetchPathaoAreas(formData.zone_id);
    }
  }, [formData.zone_id, provider]);

  const fetchPathaoCities = async () => {
    try {
      setLoadingCities(true);
      setApiError(null);
      const res = await fetch("/api/courier/pathao?action=cities");
      const data = await res.json();
      if (data.error) {
        setApiError(data.error);
        return;
      }
      if (data.data) {
        setCities(data.data);
        const dhaka = data.data.find((c: PathaoCity) =>
          c.city_name.toLowerCase().includes("dhaka"),
        );
        if (dhaka) {
          setFormData((prev) => ({ ...prev, city_id: String(dhaka.city_id) }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      setApiError("Failed to connect to Pathao API. Please check credentials.");
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchPathaoZones = async (cityId: string) => {
    try {
      setLoadingZones(true);
      const res = await fetch(
        `/api/courier/pathao?action=zones&city_id=${cityId}`,
      );
      const data = await res.json();
      if (data.data) {
        setZones(data.data);
        setAreas([]);
        setFormData((prev) => ({ ...prev, zone_id: "", area_id: "" }));
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    } finally {
      setLoadingZones(false);
    }
  };

  const fetchPathaoAreas = async (zoneId: string) => {
    try {
      setLoadingAreas(true);
      const res = await fetch(
        `/api/courier/pathao?action=areas&zone_id=${zoneId}`,
      );
      const data = await res.json();
      if (data.data) {
        setAreas(data.data);
        setFormData((prev) => ({ ...prev, area_id: "" }));
      }
    } catch (error) {
      console.error("Failed to fetch areas:", error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const fetchPathaoStores = async () => {
    try {
      setLoadingStores(true);
      const res = await fetch("/api/courier/pathao?action=stores");
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setStores(data.data);
        setFormData((prev) => ({
          ...prev,
          store_id: String(data.data[0].store_id),
        }));
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (provider === "pathao") {
        if (!formData.store_id || !formData.city_id || !formData.zone_id) {
          toast.error("Please select store, city, and zone");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/courier/pathao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_order",
            order_id: order.id,
            store_id: parseInt(formData.store_id),
            merchant_order_id: order.order_number,
            sender_name:
              stores.find((s) => String(s.store_id) === formData.store_id)
                ?.store_name || "Evolution Gadget",
            sender_phone: "",
            recipient_name: formData.recipient_name,
            recipient_phone: formData.recipient_phone,
            recipient_address: formData.recipient_address,
            recipient_city: parseInt(formData.city_id),
            recipient_zone: parseInt(formData.zone_id),
            recipient_area: formData.area_id
              ? parseInt(formData.area_id)
              : undefined,
            delivery_type: formData.delivery_type === "express" ? 12 : 48,
            item_type: 2,
            special_instruction: formData.special_instruction,
            item_quantity: parseInt(formData.item_quantity),
            item_weight: parseFloat(formData.item_weight),
            amount_to_collect: parseFloat(formData.amount_to_collect),
            item_description: formData.item_description,
          }),
        });

        const result = await res.json();

        if (result.error) {
          throw new Error(result.error);
        }

        toast.success(
          `Shipment created! Tracking: ${result.data?.data?.consignment_id}`,
        );
        onSuccess();
      } else if (provider === "steadfast") {
        if (!formData.recipient_phone || !formData.recipient_address) {
          toast.error("Please fill in phone and address");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/courier/steadfast?action=create_order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            recipient_name: formData.recipient_name,
            recipient_phone: formData.recipient_phone,
            recipient_address: formData.recipient_address,
            amount_to_collect: parseFloat(formData.amount_to_collect),
            delivery_type: formData.delivery_type,
            special_instruction: formData.special_instruction,
            item_description: formData.item_description,
          }),
        });

        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to create shipment");
        }

        toast.success(`Shipment created! Tracking: ${result.tracking_number}`);
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create shipment",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white pb-4">
        <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Truck className="size-5" />
          </div>
          Create Shipment
        </CardTitle>
        <p className="text-orange-100 text-sm mt-1">
          Order #{order.order_number} · ৳{order.total}
        </p>
      </CardHeader>

      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Provider Selection - Visual Cards */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              Courier Provider
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("steadfast")}
                className={`relative p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                  provider === "steadfast"
                    ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-100"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {provider === "steadfast" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="size-4 text-orange-500" />
                  </div>
                )}
                <div className="font-bold text-sm">Steadfast</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Simple & Fast
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProvider("pathao")}
                className={`relative p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                  provider === "pathao"
                    ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-100"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {provider === "pathao" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="size-4 text-orange-500" />
                  </div>
                )}
                <div className="font-bold text-sm">Pathao</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Zone-based Delivery
                </div>
              </button>
            </div>
          </div>

          {/* API Error Banner */}
          {apiError && provider === "pathao" && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm">
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Connection Error</p>
                <p className="text-red-600 text-xs mt-0.5">{apiError}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Delivery Type */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 block">
              Delivery Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    delivery_type: "standard",
                  }))
                }
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                  formData.delivery_type === "standard"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formData.delivery_type === "standard"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Home className="size-4" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Home Delivery</div>
                  <div className="text-[11px] text-muted-foreground">
                    {provider === "pathao" ? "48hr delivery" : "Standard"}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, delivery_type: "express" }))
                }
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                  formData.delivery_type === "express"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formData.delivery_type === "express"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Zap className="size-4" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {provider === "pathao" ? "Point Pickup" : "Express"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {provider === "pathao"
                      ? "12hr delivery"
                      : "Faster delivery"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <Separator />

          {/* Recipient Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <User className="size-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recipient Details
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Phone className="size-3 text-muted-foreground" />
                    Phone
                  </Label>
                  <Input
                    value={formData.recipient_phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recipient_phone: e.target.value,
                      }))
                    }
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <User className="size-3 text-muted-foreground" />
                    Name
                  </Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recipient_name: e.target.value,
                      }))
                    }
                    placeholder="Customer name"
                    maxLength={100}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="size-3 text-muted-foreground" />
                  Address
                  <span className="text-muted-foreground font-normal">
                    (max 250 chars)
                  </span>
                </Label>
                <Textarea
                  value={formData.recipient_address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recipient_address: e.target.value,
                    }))
                  }
                  placeholder="Full delivery address"
                  rows={2}
                  maxLength={250}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pathao Location Selection */}
          {provider === "pathao" && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <MapPin className="size-3.5 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pathao Location
                  </span>
                  {(loadingCities || loadingStores) && (
                    <Loader2 className="size-3.5 animate-spin text-orange-500 ml-auto" />
                  )}
                </div>

                <div className="space-y-3">
                  {/* Store */}
                  {loadingStores ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                  ) : stores.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Store className="size-3 text-muted-foreground" />
                        Pickup Store
                      </Label>
                      <Select
                        value={formData.store_id}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, store_id: v }))
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem
                              key={store.store_id}
                              value={String(store.store_id)}
                            >
                              {store.store_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {/* City & Zone - side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">City</Label>
                      {loadingCities ? (
                        <Skeleton className="h-9 w-full rounded-md" />
                      ) : (
                        <Select
                          value={formData.city_id}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, city_id: v }))
                          }
                          disabled={cities.length === 0}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem
                                key={city.city_id}
                                value={String(city.city_id)}
                              >
                                {city.city_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        Zone
                        {loadingZones && (
                          <Loader2 className="size-3 animate-spin text-orange-500" />
                        )}
                      </Label>
                      {loadingZones ? (
                        <Skeleton className="h-9 w-full rounded-md" />
                      ) : (
                        <Select
                          value={formData.zone_id}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, zone_id: v }))
                          }
                          disabled={!formData.city_id || zones.length === 0}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((zone) => (
                              <SelectItem
                                key={zone.zone_id}
                                value={String(zone.zone_id)}
                              >
                                {zone.zone_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Area */}
                  {(areas.length > 0 || loadingAreas) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        Area
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          Optional
                        </Badge>
                        {loadingAreas && (
                          <Loader2 className="size-3 animate-spin text-orange-500" />
                        )}
                      </Label>
                      {loadingAreas ? (
                        <Skeleton className="h-9 w-full rounded-md" />
                      ) : (
                        <Select
                          value={formData.area_id}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, area_id: v }))
                          }
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select area" />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem
                                key={area.area_id}
                                value={String(area.area_id)}
                              >
                                {area.area_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Shipment Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Package className="size-3.5 text-purple-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Package Details
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Banknote className="size-3 text-muted-foreground" />
                    COD (৳)
                  </Label>
                  <Input
                    type="number"
                    value={formData.amount_to_collect}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount_to_collect: e.target.value,
                      }))
                    }
                    min="0"
                    className="h-9 text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Scale className="size-3 text-muted-foreground" />
                    Weight (KG)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.item_weight}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        item_weight: e.target.value,
                      }))
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Hash className="size-3 text-muted-foreground" />
                    Qty
                  </Label>
                  <Input
                    type="number"
                    value={formData.item_quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        item_quantity: e.target.value,
                      }))
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <FileText className="size-3 text-muted-foreground" />
                  Item Description
                </Label>
                <Input
                  value={formData.item_description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      item_description: e.target.value,
                    }))
                  }
                  placeholder="Product names..."
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <StickyNote className="size-3 text-muted-foreground" />
                  Note
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-normal"
                  >
                    Optional
                  </Badge>
                </Label>
                <Textarea
                  value={formData.special_instruction}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      special_instruction: e.target.value,
                    }))
                  }
                  placeholder="Special delivery instructions..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200 transition-all duration-200"
            disabled={loading || (provider === "pathao" && !!apiError)}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating Shipment...
              </>
            ) : (
              <>
                <Truck className="size-4 mr-2" />
                Create Shipment with{" "}
                {provider === "pathao" ? "Pathao" : "Steadfast"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
