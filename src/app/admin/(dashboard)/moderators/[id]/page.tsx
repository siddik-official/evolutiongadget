import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Order } from "@/types";

export default async function ModeratorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: moderator } = await supabase
    .from("admin_profiles")
    .select(
      "id, full_name, role, sales_target, sales_target_metric, sales_target_type, sales_target_start_date, sales_target_end_date",
    )
    .eq("id", id)
    .single();

  if (!moderator || moderator.role !== "moderator") {
    notFound();
  }

  const { data: rawOrders } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total, status, created_at")
    .or(`created_by_profile_id.eq.${id},recommended_by_profile_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(1000);

  const orders = (rawOrders || []) as Pick<
    Order,
    "id" | "order_number" | "customer_name" | "total" | "status" | "created_at"
  >[];

  const hasTargetPeriod =
    !!moderator.sales_target_start_date && !!moderator.sales_target_end_date;
  const rangeStart = hasTargetPeriod
    ? new Date(`${moderator.sales_target_start_date}T00:00:00`)
    : null;
  const rangeEnd = hasTargetPeriod
    ? new Date(`${moderator.sales_target_end_date}T23:59:59.999`)
    : null;

  const periodOrders = hasTargetPeriod
    ? orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return (
          !!rangeStart &&
          !!rangeEnd &&
          orderDate >= rangeStart &&
          orderDate <= rangeEnd
        );
      })
    : orders;

  const target = Number(moderator.sales_target || 0);
  const totalSales = periodOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const deliveredSales = periodOrders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const metric = moderator.sales_target_metric || "amount";
  const achievedValue = metric === "orders" ? periodOrders.length : totalSales;
  const progress =
    target > 0 ? Math.min(100, (achievedValue / target) * 100) : 0;
  const overTarget = target > 0 ? Math.max(0, achievedValue - target) : 0;

  const byDate = new Map<string, { qty: number; total: number }>();
  for (const order of periodOrders) {
    const dateKey = new Date(order.created_at).toISOString().slice(0, 10);
    const prev = byDate.get(dateKey) || { qty: 0, total: 0 };
    byDate.set(dateKey, {
      qty: prev.qty + 1,
      total: prev.total + Number(order.total || 0),
    });
  }

  const dailyRows: Array<{ date: string; qty: number; total: number }> = [];
  if (rangeStart && rangeEnd) {
    for (
      const cursor = new Date(rangeStart);
      cursor <= rangeEnd;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const current = byDate.get(dateKey) || { qty: 0, total: 0 };
      dailyRows.push({ date: dateKey, qty: current.qty, total: current.total });
    }
  } else {
    for (const [date, values] of byDate.entries()) {
      dailyRows.push({ date, qty: values.qty, total: values.total });
    }
    dailyRows.sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{moderator.full_name}</h1>
          <p className="text-muted-foreground">
            Moderator performance summary (
            {moderator.sales_target_type || "not set"}
            {hasTargetPeriod
              ? `: ${moderator.sales_target_start_date} to ${moderator.sales_target_end_date}`
              : ""}
            )
          </p>
        </div>
        <Link
          href="/admin/moderators"
          className="text-sm text-primary hover:underline"
        >
          Back to all moderators
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {metric === "orders"
                ? `${target.toLocaleString()} orders`
                : formatPrice(target)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatPrice(totalSales)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Delivered Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatPrice(deliveredSales)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Order Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{periodOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            {achievedValue.toLocaleString()} / {target.toLocaleString()}
            {overTarget > 0
              ? metric === "orders"
                ? ` (+${overTarget.toLocaleString()})`
                : ` (+${formatPrice(overTarget)})`
              : ""}
            {` (${progress.toFixed(1)}%)`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders Created by {moderator.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          {periodOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders found for this moderator.
            </p>
          ) : (
            <div className="space-y-2">
              {periodOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_name} ·{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(order.total)}</p>
                      <Badge variant="outline" className="capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No period data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.qty}</TableCell>
                    <TableCell>{formatPrice(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
