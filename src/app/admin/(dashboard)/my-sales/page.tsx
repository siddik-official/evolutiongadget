import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export default async function MySalesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select(
      "id, role, full_name, sales_target, sales_target_metric, sales_target_type, sales_target_start_date, sales_target_end_date",
    )
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "moderator") {
    redirect("/admin/orders");
  }

  const { data: rawOrders } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total, status, created_at")
    .eq("created_by_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const orders = (rawOrders || []) as Pick<
    Order,
    "id" | "order_number" | "customer_name" | "total" | "status" | "created_at"
  >[];

  const hasTargetPeriod =
    !!profile.sales_target_start_date && !!profile.sales_target_end_date;
  const rangeStart = hasTargetPeriod
    ? new Date(`${profile.sales_target_start_date}T00:00:00`)
    : null;
  const rangeEnd = hasTargetPeriod
    ? new Date(`${profile.sales_target_end_date}T23:59:59.999`)
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

  const totalOrders = periodOrders.length;
  const totalSales = periodOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const deliveredSales = periodOrders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const achievedOrders = periodOrders.length;
  const target = Number(profile.sales_target || 0);
  const metric = profile.sales_target_metric || "amount";
  const achievedValue = metric === "orders" ? achievedOrders : totalSales;
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
      <div>
        <h1 className="text-2xl font-bold">My Sales Summary</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile.full_name}. These are your created order and
          sales stats.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Period: {profile.sales_target_type || "not set"}
          {hasTargetPeriod
            ? ` (${profile.sales_target_start_date} to ${profile.sales_target_end_date})`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Sales Target
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
              Delivered Sales
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
              Created Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{achievedOrders}</p>
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
            {target > 0
              ? `${achievedValue.toLocaleString()} / ${target.toLocaleString()}${
                  overTarget > 0
                    ? metric === "orders"
                      ? ` (+${overTarget.toLocaleString()})`
                      : ` (+${formatPrice(overTarget)})`
                    : ""
                } (${progress.toFixed(1)}%)`
              : "No sales target set yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {periodOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders created yet.
            </p>
          ) : (
            <div className="space-y-2">
              {periodOrders.slice(0, 20).map((order) => (
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
