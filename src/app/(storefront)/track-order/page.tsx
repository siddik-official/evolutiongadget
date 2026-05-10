"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Search,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Truck,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Scissors,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import type {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderStatus,
} from "@/types";

// ── Status pipeline (for progress bar) ──
const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="size-4" />,
  confirmed: <CheckCircle2 className="size-4" />,
  processing: <Package className="size-4" />,
  shipped: <Truck className="size-4" />,
  delivered: <CheckCircle2 className="size-4" />,
  canceled: <XCircle className="size-4" />,
  returned: <RotateCcw className="size-4" />,
};

function getStatusColor(status: string) {
  return (
    ORDER_STATUSES.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-800"
  );
}

function StatusProgress({ status }: { status: OrderStatus }) {
  const isCanceled = status === "canceled" || status === "returned";

  if (isCanceled) {
    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
          status === "canceled"
            ? "bg-red-50 text-red-700"
            : "bg-gray-100 text-gray-700"
        }`}
      >
        {STATUS_ICONS[status]}
        <span>
          {status === "canceled"
            ? "This order has been canceled."
            : "This order has been returned."}
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const current = i === currentIndex;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`size-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-muted-foreground/30 text-muted-foreground"
                  } ${current ? "ring-4 ring-primary/20" : ""}`}
                >
                  {done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className="size-4" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium capitalize whitespace-nowrap ${
                    done ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
              {/* Connector line */}
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type TrackOrder = Order & {
  items: OrderItem[];
  status_history: OrderStatusHistory[];
};

function OrderCard({ order }: { order: TrackOrder }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      {/* Card header (always visible) */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">
              Order #{order.order_number}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Placed on{" "}
              {new Date(order.created_at).toLocaleDateString("en-BD", {
                dateStyle: "medium",
              })}
              {" · "}
              {new Date(order.created_at).toLocaleTimeString("en-BD", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(order.status)}>
              {STATUS_ICONS[order.status]}
              <span className="ml-1 capitalize">{order.status}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Progress bar */}
          <StatusProgress status={order.status} />

          <Separator />

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Items Ordered
            </p>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({formatVariantShort(item.variant_size, item.variant_attributes)}
                        {item.variant_color ? `, ${item.variant_color}` : ""})
                      </span>
                      <span className="text-muted-foreground ml-1">
                        × {item.quantity}
                      </span>
                    </div>
                    <span className="font-medium ml-4 shrink-0">
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                  {item.customization_note && (
                    <div className="mt-1 flex items-start gap-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                      <Scissors className="size-3 shrink-0 mt-0.5" />
                      <span>{item.customization_note}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span>
                {order.delivery_charge === 0
                  ? "Free"
                  : formatPrice(order.delivery_charge)}
              </span>
            </div>
            {(() => {
              const customizationCharge =
                order.total -
                order.subtotal -
                order.delivery_charge +
                (order.discount_amount ?? 0);
              return customizationCharge > 0 ? (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <Scissors className="size-3" /> Customization
                  </span>
                  <span>{formatPrice(customizationCharge)}</span>
                </div>
              ) : null;
            })()}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>− {formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Delivery + history row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Delivery info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Delivery Address
              </p>
              <div className="text-sm space-y-1">
                <div className="flex items-start gap-1.5">
                  <Phone className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>{order.customer_phone}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>
                    {order.delivery_type === "store_pickup"
                      ? "In-store pickup"
                      : `${order.address}${order.area ? `, ${order.area}` : ""}, ${order.district}, ${order.division}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Status history */}
            {order.status_history && order.status_history.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Status History
                </p>
                <div className="space-y-2">
                  {order.status_history.map((h, idx) => (
                    <div key={h.id} className="flex gap-2 text-xs">
                      <div className="flex flex-col items-center mt-0.5">
                        <div
                          className={`size-2 rounded-full shrink-0 ${
                            idx === order.status_history.length - 1
                              ? "bg-primary"
                              : "bg-muted-foreground/40"
                          }`}
                        />
                        {idx < order.status_history.length - 1 && (
                          <div className="w-px flex-1 bg-muted-foreground/20 my-0.5 min-h-[12px]" />
                        )}
                      </div>
                      <div className="pb-1">
                        <span className="font-medium capitalize">
                          {h.status}
                        </span>
                        {h.note && (
                          <span className="text-muted-foreground ml-1">
                            — {h.note}
                          </span>
                        )}
                        <p className="text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString("en-BD", {
                            dateStyle: "short",
                          })}{" "}
                          {new Date(h.created_at).toLocaleTimeString("en-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TrackOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-search when pre-filled from URL (e.g. from thank-you page)
  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) {
      setQuery(q);
      doSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(q: string) {
    setLoading(true);
    setError(null);
    setOrders(null);
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setOrders(data.orders);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    await doSearch(q);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero */}
      <div className="bg-[#111318] text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Package className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Track Your Order
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter your order number or phone number to check the latest status
            of your order.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Search form */}
        <Card className="shadow-md mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-3">
              <div>
                <label
                  htmlFor="track-input"
                  className="block text-sm font-medium mb-1.5"
                >
                  Order Number or Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      id="track-input"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. VS-ABC123-XY or 01XXXXXXXXX"
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="gap-2 shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Track
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can find your order number in the confirmation SMS or on
                your order confirmation page.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 mb-6">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {orders && orders.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found{" "}
              <span className="font-semibold text-foreground">
                {orders.length} order{orders.length > 1 ? "s" : ""}
              </span>{" "}
              for your search.
            </p>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Help text */}
        {!orders && !error && !loading && (
          <div className="text-center text-sm text-muted-foreground space-y-2 py-6">
            <p>
              <strong className="text-foreground">Tip:</strong> Use your order
              number (e.g.{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                VS-ABC-XY12
              </code>
              ) for a specific order.
            </p>
            <p>Use your phone number to see all past orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}
