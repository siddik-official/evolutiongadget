"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Scissors,
  FileText,
  Truck,
  Shield,
  History,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Order, OrderStatus, OrderStatusHistory } from "@/types";
import { toast } from "sonner";
import {
  CourierForm,
  CourierStatusDisplay,
  FraudCheck,
} from "@/components/admin/courier";
import { FraudCheckDisplay } from "@/components/admin/FraudCheckDisplay";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";

export default function AdminOrderDetailPage() {
  const { role } = useAdminRole();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [approvingPayment, setApprovingPayment] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState(false);
  const [resettingPayment, setResettingPayment] = useState(false);
  const canManageOrder = role === "admin" || role === "super_admin";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const [orderRes, itemsRes, historyRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (orderRes.data) {
      const o = orderRes.data as Order;
      o.items = (itemsRes.data || []) as Order["items"];
      setOrder(o);
      setNewStatus(o.status);

      // Fetch customer order history for POS orders
      if (o.delivery_type === "store_pickup" && o.customer_phone) {
        const { data: prevOrders } = await supabase
          .from("orders")
          .select("id, order_number, created_at, total, status, delivery_type")
          .eq("customer_phone", o.customer_phone)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (prevOrders) {
          setCustomerOrders(prevOrders as Order[]);
        }
      }
    }
    setHistory((historyRes.data || []) as OrderStatusHistory[]);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async () => {
    if (!canManageOrder) return;
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    try {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);
      if (orderErr) throw orderErr;

      const { error: histErr } = await supabase
        .from("order_status_history")
        .insert({
          order_id: order.id,
          status: newStatus,
          note: statusNote || null,
        });
      if (histErr) throw histErr;

      toast.success(`Status updated to ${newStatus}`);
      setStatusNote("");
      fetchOrder();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!canManageOrder || !order) return;
    setApprovingPayment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_payment_status: "verified" })
        .eq("id", order.id);
      if (error) throw error;
      toast.success("Payment approved!");
      fetchOrder();
    } catch {
      toast.error("Failed to approve payment");
    } finally {
      setApprovingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!canManageOrder || !order) return;
    setRejectingPayment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_payment_status: "rejected" })
        .eq("id", order.id);
      if (error) throw error;
      toast.error("Payment rejected.");
      fetchOrder();
    } catch {
      toast.error("Failed to reject payment");
    } finally {
      setRejectingPayment(false);
    }
  };

  const handleResetPayment = async () => {
    if (!canManageOrder || !order) return;
    setResettingPayment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_payment_status: "pending" })
        .eq("id", order.id);
      if (error) throw error;
      toast.success("Payment reset to pending.");
      fetchOrder();
    } catch {
      toast.error("Failed to reset payment");
    } finally {
      setResettingPayment(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const found = ORDER_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <p className="text-center py-12 text-muted-foreground">Loading...</p>
    );
  }

  if (!order) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        Order not found.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/orders/${id}/invoice`}>
              <FileText className="size-4 mr-2" />
              Invoice
            </Link>
          </Button>
          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatVariantShort(
                          item.variant_size,
                          item.variant_attributes,
                        )}
                        {item.variant_color &&
                          ` · Color: ${item.variant_color}`}
                        {" · "}Qty: {item.quantity}
                      </p>
                      {item.customization_note && (
                        <div className="mt-1 flex items-start gap-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                          <Scissors className="size-3 shrink-0 mt-0.5" />
                          <span>{item.customization_note}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.total_price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.unit_price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{formatPrice(order.delivery_charge)}</span>
                </div>
                {(() => {
                  const customizationCharge =
                    order.total -
                    order.subtotal -
                    order.delivery_charge +
                    (order.discount_amount ?? 0);
                  return customizationCharge > 0 ? (
                    <div className="flex justify-between text-blue-700 dark:text-blue-400">
                      <span className="flex items-center gap-1">
                        <Scissors className="size-3" /> Customization
                      </span>
                      <span>+{formatPrice(customizationCharge)}</span>
                    </div>
                  ) : null;
                })()}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Analysis */}
          {order.delivery_type !== "store_pickup" && (() => {
            const productCost = (order.items || []).reduce(
              (sum, item) => sum + (item.cost_price || 0) * item.quantity,
              0,
            );
            const advancePaid = order.advance_payment_amount || 0;
            const codAmount = Math.max(0, order.total - advancePaid);
            // Courier deduction = 1% of COD + delivery charge
            const courierDeduction = Math.round(codAmount * 0.01 + order.delivery_charge);
            const receivedFromCourier = Math.max(0, codAmount - courierDeduction + order.delivery_charge);
            const netProfit =
              order.subtotal - productCost + advancePaid - courierDeduction;

            return (
              <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                    <TrendingUp className="size-4" />
                    Financial Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {/* Left column — Order Summary */}
                    <div className="space-y-2">
                      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Order Summary</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product Cost:</span>
                        <span className="text-red-600 font-medium">৳{productCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product Sell Price:</span>
                        <span>৳{order.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Charge:</span>
                        <span>৳{order.delivery_charge.toLocaleString()}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Total Customer Bill:</span>
                        <span>৳{order.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Right column — Collection & Profit */}
                    <div className="space-y-2">
                      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Collection & Profit</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Advance Paid:</span>
                        <span className="text-blue-600 font-medium">৳{advancePaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">COD Amount:</span>
                        <span>৳{codAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Courier Deduction (1% COD + Delivery):</span>
                        <span className="text-red-600">-৳{courierDeduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received From Courier:</span>
                        <span className="text-blue-600">৳{receivedFromCourier.toLocaleString()}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold text-base">
                        <span className="text-green-700 dark:text-green-400">Net Profit:</span>
                        <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                          ৳{netProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {h.status}
                        </p>
                        {h.note && (
                          <p className="text-sm text-muted-foreground">
                            {h.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {order.customer_name}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-primary hover:underline"
                >
                  {order.customer_phone}
                </a>
              </p>
              {order.customer_email && (
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {order.customer_email}
                </p>
              )}
              {/* Fraud Check */}
              <div className="pt-3 border-t mt-3">
                <FraudCheck defaultPhone={order.customer_phone} compact />
              </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{order.address}</p>
              <p>
                {order.area && `${order.area}, `}
                {order.district}, {order.division}
              </p>
              <Separator className="my-3" />
              {/* Payment Method */}
              <div className="space-y-2">
                <p>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {order.payment_method === "advance" ? (
                    <Badge
                      variant="outline"
                      className="ml-1 border-pink-300 bg-pink-50 text-pink-700"
                    >
                      📱 Advance Payment
                    </Badge>
                  ) : order.payment_method === "cash" ? (
                    <Badge variant="outline" className="ml-1">
                      💵 Cash
                    </Badge>
                  ) : order.payment_method === "online" ? (
                    <Badge
                      variant="outline"
                      className="ml-1 border-blue-300 bg-blue-50 text-blue-700"
                    >
                      💳 Online Payment
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1">
                      💵 Cash on Delivery
                    </Badge>
                  )}
                </p>

                {/* Advance Payment Details */}
                {order.payment_method === "advance" && (
                  <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        Method:
                      </span>
                      <div className="flex items-center gap-1.5">
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
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          Amount Paid:
                        </span>
                        <span className="font-medium text-green-600">
                          {formatPrice(order.advance_payment_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        Sender Phone:
                      </span>
                      <span className="font-mono font-medium">
                        {order.advance_payment_sender_phone || "-"}
                      </span>
                    </div>
                    {order.advance_payment_txn_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          Transaction ID:
                        </span>
                        <span className="font-mono font-medium">
                          {order.advance_payment_txn_id}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        Status:
                      </span>
                      <Badge
                        variant={
                          order.delivery_payment_status === "verified"
                            ? "default"
                            : order.delivery_payment_status === "paid"
                              ? "secondary"
                              : order.delivery_payment_status === "rejected"
                                ? "destructive"
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
                          ? "✓ Approved"
                          : order.delivery_payment_status === "paid"
                            ? "Paid (Pending Approval)"
                            : order.delivery_payment_status === "rejected"
                              ? "✗ Rejected"
                              : "Pending"}
                      </Badge>
                    </div>

                    {/* Advance Payment Actions */}
                    {canManageOrder && order.payment_method === "advance" && (() => {
                      const status = order.delivery_payment_status;
                      return (
                        <div className="pt-2 border-t border-pink-200 space-y-2">
                          {/* Pending state: show Approve + Reject */}
                          {(status === "pending" || status === "paid") && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleApprovePayment}
                                disabled={approvingPayment || rejectingPayment}
                              >
                                {approvingPayment ? (
                                  <Loader2 className="size-4 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleRejectPayment}
                                disabled={approvingPayment || rejectingPayment}
                              >
                                {rejectingPayment ? (
                                  <Loader2 className="size-4 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="size-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          )}

                          {/* Approved state */}
                          {status === "verified" && (
                            <>
                              <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                                <CheckCircle2 className="size-3.5" /> Payment Approved
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={handleResetPayment}
                                disabled={resettingPayment}
                              >
                                {resettingPayment ? (
                                  <Loader2 className="size-4 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-4 mr-1" />
                                )}
                                Reset to Pending
                              </Button>
                            </>
                          )}

                          {/* Rejected state */}
                          {status === "rejected" && (
                            <>
                              <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                                <XCircle className="size-3.5" /> Payment Rejected
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={handleResetPayment}
                                disabled={resettingPayment}
                              >
                                {resettingPayment ? (
                                  <Loader2 className="size-4 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-4 mr-1" />
                                )}
                                Reset to Pending
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-3">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courier Section - Only show for delivery orders, not POS */}
          {order.delivery_type !== "store_pickup" && (
            <>
              {order.tracking_number ? (
                <CourierStatusDisplay
                  provider={order.courier_provider}
                  trackingNumber={order.tracking_number}
                  status={order.courier_status}
                  shippedAt={order.shipped_at}
                />
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="size-4" />
                      Courier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {showCourierForm && canManageOrder ? (
                      <CourierForm
                        order={order}
                        onSuccess={() => {
                          setShowCourierForm(false);
                          fetchOrder();
                        }}
                      />
                    ) : (
                      <>
                        {canManageOrder ? (
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setShowCourierForm(true)}
                          >
                            <Truck className="size-4 mr-2" />
                            Create Shipment
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Shipment actions are only available for admin users.
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Fraud Check - Only show for delivery orders, not POS */}
          {order.delivery_type !== "store_pickup" && (
            <FraudCheckDisplay
              orderId={order.id}
              customerName={order.customer_name}
              phone={order.customer_phone}
              address={order.address}
              codAmount={order.total}
              district={order.district}
              policeStation={order.area || undefined}
              autoCheck={true}
            />
          )}

          {/* Customer Order History - Only for POS orders */}
          {order.delivery_type === "store_pickup" &&
            customerOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <History className="size-4" />
                    Customer Order History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customerOrders.map((prevOrder) => (
                      <Link
                        key={prevOrder.id}
                        href={`/admin/orders/${prevOrder.id}`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              {prevOrder.order_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                prevOrder.created_at,
                              ).toLocaleDateString()}
                              {prevOrder.delivery_type === "store_pickup" &&
                                " · POS"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatPrice(prevOrder.total)}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                prevOrder.status === "delivered"
                                  ? "border-green-300 bg-green-50 text-green-700"
                                  : prevOrder.status === "canceled"
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-yellow-300 bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {prevOrder.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Customization Summary */}
          {order.items?.some((item) => item.customization_note) && (
            <Card className="border-amber-300 dark:border-amber-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Scissors className="size-4" />
                  Jersey Customization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.items
                  ?.filter((item) => item.customization_note)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-xs text-muted-foreground mb-0.5">
                        {item.product_name} ·{" "}
                        {formatVariantShort(
                          item.variant_size,
                          item.variant_attributes,
                        )}
                      </p>
                      <p className="text-amber-800 dark:text-amber-300">
                        {item.customization_note}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Update Status */}
          {canManageOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add a note about this status change..."
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === order.status}
                >
                  {updating && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
