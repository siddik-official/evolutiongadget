import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  ArrowRight,
  Package,
  MessageCircle,
  Scissors,
  FileText,
} from "lucide-react";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { PurchaseTracker } from "@/components/checkout/PurchaseTracker";

export const metadata: Metadata = {
  title: "Order Confirmed",
};

// Enable dynamic rendering for this route
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function ThankYouPage({ params }: Props) {
  const { orderId } = await params;
  let order = null;
  let whatsappNumber = "";

  try {
    const supabase = createAdminClient();

    const [orderRes, settingsRes] = await Promise.all([
      supabase
        .from("orders")
        .select(`*, items:order_items(*)`)
        .eq("order_number", orderId)
        .single(),
      supabase
        .from("store_settings")
        .select("key, value")
        .in("key", ["whatsapp_number", "customization_enabled"]),
    ]);

    order = orderRes.data;

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.data || []) {
      settingsMap[row.key] = row.value ?? "";
    }
    if (settingsMap.customization_enabled === "true") {
      whatsappNumber = settingsMap.whatsapp_number || "";
    }
  } catch {
    // Supabase not configured
  }

  if (!order) {
    notFound();
  }

  // Check if user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = !!user;

  // Build WhatsApp message if any item has customization
  type OrderItem = {
    id: string;
    product_name: string;
    variant_size: string;
    variant_attributes?: Record<string, string> | null;
    quantity: number;
    total_price: number;
    customization_note?: string | null;
  };

  const customizedItems: OrderItem[] = (order.items || []).filter(
    (item: OrderItem) => item.customization_note,
  );

  const showWhatsApp = whatsappNumber && customizedItems.length > 0;

  const buildWhatsAppUrl = () => {
    const lines = [
      `Hello! I placed an order on Evolution Gadget.`,
      ``,
      `Order #: ${order.order_number}`,
      `Customer: ${order.customer_name}`,
      `Phone: ${order.customer_phone}`,
      ``,
      `Customization Request:`,
      ...customizedItems.map(
        (item: OrderItem) =>
          `- ${item.product_name} (${formatVariantShort(item.variant_size, item.variant_attributes)}): ${item.customization_note}`,
      ),
      ``,
      `Please confirm the customization. Thank you!`,
    ];
    const message = encodeURIComponent(lines.join("\n"));
    const number = whatsappNumber.replace(/\D/g, "");
    return `https://wa.me/${number}?text=${message}`;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <PurchaseTracker order={order} />
      <div className="text-center mb-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground mt-2">
          Thank you for your order. We&apos;ll process it shortly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order #{order.order_number}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-BD", {
                dateStyle: "medium",
              })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items */}
          <div className="space-y-2">
            {order.items?.map((item: OrderItem) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between">
                  <span>
                    {item.product_name} (
                    {formatVariantShort(
                      item.variant_size,
                      item.variant_attributes,
                    )}
                    ) × {item.quantity}
                  </span>
                  <span>{formatPrice(item.total_price)}</span>
                </div>
                {item.customization_note && (
                  <p className="text-xs text-primary mt-0.5 pl-2">
                    ✂️ Customization: {item.customization_note}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>
                {order.delivery_charge > 0
                  ? formatPrice(order.delivery_charge)
                  : "Free"}
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
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>
                {order.payment_method === "advance" ? "Total" : "Total (COD)"}
              </span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>

            {/* Advance Payment Info */}
            {order.payment_method === "advance" && (
              <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 space-y-2 mt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        order.advance_payment_method === "bkash"
                          ? "/bkash.svg"
                          : "/nagad.png"
                      }
                      alt={
                        order.advance_payment_method === "bkash"
                          ? "bKash"
                          : "Nagad"
                      }
                      className="w-5 h-5 object-contain"
                    />
                    <span className="font-medium text-sm">
                      {order.advance_payment_method === "bkash"
                        ? "bKash"
                        : "Nagad"}
                    </span>
                  </div>
                </div>
                {order.advance_payment_amount > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      Amount Paid:
                    </span>
                    <span className="font-medium text-green-600">
                      {formatPrice(order.advance_payment_amount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    Payment Status:
                  </span>
                  <Badge
                    variant={
                      order.delivery_payment_status === "verified"
                        ? "default"
                        : order.delivery_payment_status === "paid"
                          ? "secondary"
                          : "outline"
                    }
                    className={
                      order.delivery_payment_status === "verified"
                        ? "bg-green-600"
                        : order.delivery_payment_status === "paid"
                          ? "bg-blue-100 text-blue-700"
                          : ""
                    }
                  >
                    {order.delivery_payment_status === "verified"
                      ? "✓ Verified"
                      : order.delivery_payment_status === "paid"
                        ? "Pending Verification"
                        : "Pending"}
                  </Badge>
                </div>
                {order.total - order.advance_payment_amount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-pink-200 dark:border-pink-800 flex-wrap gap-2">
                    <span className="text-sm font-medium">
                      Remaining (COD):
                    </span>
                    <span className="font-bold text-primary">
                      {formatPrice(order.total - order.advance_payment_amount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="text-sm space-y-1">
            <p>
              <strong>Name:</strong> {order.customer_name}
            </p>
            <p>
              <strong>Phone:</strong> {order.customer_phone}
            </p>
            <p>
              <strong>Address:</strong> {order.address}, {order.area || ""}{" "}
              {order.district}, {order.division}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp customization banner */}
      {showWhatsApp && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start gap-3">
            <MessageCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Confirm your jersey customization on WhatsApp
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                You requested name &amp; number printing. Please send us a
                WhatsApp message to finalize the customization details.
              </p>
              <Button
                className="mt-3 bg-green-600 hover:bg-green-700 text-white gap-2 h-9"
                asChild
              >
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  Send on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-8 space-y-3">
        <p className="text-sm text-muted-foreground">
          We&apos;ll contact you at <strong>{order.customer_phone}</strong> to
          confirm your order.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isAdmin && (
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/invoice/${order.id}`}>
                <FileText className="size-4" />
                View Invoice
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/track-order?q=${order.order_number}`}>
              <Package className="size-4" />
              Track This Order
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/">
              Continue Shopping <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
