"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Order, OrderStatus } from "@/types";
import { toast } from "sonner";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";

export default function AdminOrdersPage() {
  const { role, profileId, loading: roleLoading } = useAdminRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "website" | "pos" | "online_platform"
  >("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{
    id: string;
    orderNumber: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchOrders = useCallback(async () => {
    if (roleLoading) return;

    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (role === "moderator" && profileId) {
      query = query.eq("created_by_profile_id", profileId);
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`,
      );
    }

    const { data } = await query;
    let result = (data as Order[]) || [];

    if (sourceFilter !== "all") {
      result = result.filter((order) => {
        const source = getOrderSource(order);
        return source === sourceFilter;
      });
    }

    setOrders(result);
    setLoading(false);
  }, [
    search,
    sourceFilter,
    statusFilter,
    supabase,
    role,
    profileId,
    roleLoading,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const canDeleteOrders = role === "admin" || role === "super_admin";

  const getStatusColor = (status: OrderStatus) => {
    const found = ORDER_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-gray-100 text-gray-800";
  };

  const getOrderSource = (
    order: Order,
  ): "website" | "pos" | "online_platform" => {
    if (order.delivery_type === "store_pickup") return "pos";
    if (
      order.platform &&
      order.platform.trim().length > 0 &&
      order.platform !== "cell_phone"
    )
      return "online_platform";
    return "website";
  };

  const getOrderSourceLabel = (order: Order) => {
    const source = getOrderSource(order);
    if (source === "website") return "Website";
    if (source === "pos") return "POS";
    return "Online Platform";
  };

  const openDeleteDialog = (id: string, orderNumber: string) => {
    setOrderToDelete({ id, orderNumber });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      console.log("Delete order response:", {
        status: response.status,
        result,
      });

      if (!response.ok) {
        toast.error("Failed to Delete Order", {
          description: result.error || "An error occurred",
          duration: 5000,
        });
        return;
      }

      toast.success("Order deleted successfully");
      await fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order", {
        description: "Please try again later",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button asChild>
          <Link href="/admin/orders/create">
            <Plus className="size-4 mr-2" />
            Create Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, name, or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(
                value: "all" | "website" | "pos" | "online_platform",
              ) => setSourceFilter(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="online_platform">Online Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No orders found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.customer_phone}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getOrderSourceLabel(order)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(order.status)}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          {canDeleteOrders && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                openDeleteDialog(order.id, order.order_number)
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order{" "}
              <strong>{orderToDelete?.orderNumber}</strong>? This will
              permanently remove the order and all its items. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
