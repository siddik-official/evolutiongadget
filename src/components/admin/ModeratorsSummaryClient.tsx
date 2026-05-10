"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ModeratorProfile {
  id: string;
  user_id: string;
  full_name: string;
  sales_target: number;
  sales_target_metric: "amount" | "orders" | null;
  sales_target_type: "daily" | "weekly" | "monthly" | null;
  sales_target_start_date: string | null;
  sales_target_end_date: string | null;
}

interface OwnedOrder {
  created_by_profile_id: string | null;
  recommended_by_profile_id: string | null;
  total: number;
  status: string;
  created_at: string;
}

interface ModeratorStats {
  totalSales: number;
  deliveredSales: number;
  orderCount: number;
}

interface ModeratorsSummaryClientProps {
  initialModerators: ModeratorProfile[];
  initialOrders: OwnedOrder[];
}

export function ModeratorsSummaryClient({
  initialModerators,
  initialOrders,
}: ModeratorsSummaryClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [moderators] = useState<ModeratorProfile[]>(initialModerators);
  const [orders] = useState<OwnedOrder[]>(initialOrders);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] =
    useState<ModeratorProfile | null>(null);
  const [targetValue, setTargetValue] = useState(0);
  const [targetMetric, setTargetMetric] = useState<"amount" | "orders">(
    "amount",
  );
  const [targetType, setTargetType] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [targetStartDate, setTargetStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");

  const summaryByModerator = useMemo(() => {
    const ordersByModerator = new Map<string, OwnedOrder[]>();
    for (const order of orders) {
      // Count order for both the creator and the recommender
      const profileIds = new Set<string>();
      if (order.created_by_profile_id) profileIds.add(order.created_by_profile_id);
      if (order.recommended_by_profile_id) profileIds.add(order.recommended_by_profile_id);

      for (const profileId of profileIds) {
        const prev = ordersByModerator.get(profileId) || [];
        prev.push(order);
        ordersByModerator.set(profileId, prev);
      }
    }

    const summary = new Map<string, ModeratorStats>();

    for (const moderator of moderators) {
      const list = ordersByModerator.get(moderator.id) || [];
      const hasRange =
        !!moderator.sales_target_start_date &&
        !!moderator.sales_target_end_date;
      const rangeStart = hasRange
        ? new Date(`${moderator.sales_target_start_date}T00:00:00`)
        : null;
      const rangeEnd = hasRange
        ? new Date(`${moderator.sales_target_end_date}T23:59:59.999`)
        : null;

      const periodOrders = hasRange
        ? list.filter((order) => {
            const orderDate = new Date(order.created_at);
            return (
              !!rangeStart &&
              !!rangeEnd &&
              orderDate >= rangeStart &&
              orderDate <= rangeEnd
            );
          })
        : list;

      const totalSales = periodOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      );
      const deliveredSales = periodOrders
        .filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      summary.set(moderator.id, {
        totalSales,
        deliveredSales,
        orderCount: periodOrders.length,
      });
    }

    return summary;
  }, [moderators, orders]);

  const grandTargetAmount = moderators
    .filter((m) => (m.sales_target_metric || "amount") === "amount")
    .reduce((sum, mod) => sum + Number(mod.sales_target || 0), 0);

  const grandTargetOrders = moderators
    .filter((m) => m.sales_target_metric === "orders")
    .reduce((sum, mod) => sum + Number(mod.sales_target || 0), 0);

  const grandSales = moderators.reduce(
    (sum, mod) => sum + (summaryByModerator.get(mod.id)?.totalSales || 0),
    0,
  );

  const grandOrders = moderators.reduce(
    (sum, mod) => sum + (summaryByModerator.get(mod.id)?.orderCount || 0),
    0,
  );

  const openTargetDialog = (moderator: ModeratorProfile) => {
    setSelectedModerator(moderator);
    setTargetValue(Number(moderator.sales_target || 0));
    setTargetMetric(moderator.sales_target_metric || "amount");
    setTargetType(moderator.sales_target_type || "monthly");
    setTargetStartDate(moderator.sales_target_start_date || "");
    setTargetEndDate(moderator.sales_target_end_date || "");
    setTargetDialogOpen(true);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModerator) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedModerator.user_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sales_target: targetValue,
            sales_target_metric: targetMetric,
            sales_target_type: targetType,
            sales_target_start_date: targetStartDate,
            sales_target_end_date: targetEndDate,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to set target");
        return;
      }

      toast.success("Moderator target updated");
      setTargetDialogOpen(false);
      setSelectedModerator(null);
      router.refresh();
    } catch {
      toast.error("Failed to set target");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderators Summary</h1>
        <p className="text-muted-foreground">
          Admin can review moderators, set target, and track performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Amount Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatPrice(grandTargetAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Order Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{grandTargetOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatPrice(grandSales)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Created Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{grandOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderator Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {moderators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No moderators found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Moderator</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Total Sold</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moderators.map((moderator) => {
                  const stats = summaryByModerator.get(moderator.id) || {
                    totalSales: 0,
                    deliveredSales: 0,
                    orderCount: 0,
                  };

                  const metric = moderator.sales_target_metric || "amount";
                  const target = Number(moderator.sales_target || 0);
                  const achieved =
                    metric === "orders" ? stats.orderCount : stats.totalSales;
                  const progress =
                    target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
                  const overTarget =
                    target > 0 ? Math.max(0, achieved - target) : 0;

                  return (
                    <TableRow key={moderator.id}>
                      <TableCell>
                        <Link
                          href={`/admin/moderators/${moderator.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {moderator.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {metric === "orders"
                          ? `${target.toLocaleString()} orders`
                          : formatPrice(target)}
                      </TableCell>
                      <TableCell>{formatPrice(stats.totalSales)}</TableCell>
                      <TableCell>{stats.orderCount}</TableCell>
                      <TableCell>
                        {moderator.sales_target_type &&
                        moderator.sales_target_start_date &&
                        moderator.sales_target_end_date
                          ? `${moderator.sales_target_type} (${moderator.sales_target_start_date} to ${moderator.sales_target_end_date})`
                          : "Not set"}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <Progress value={progress} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {achieved.toLocaleString()} /{" "}
                          {target.toLocaleString()}
                          {overTarget > 0
                            ? metric === "orders"
                              ? ` (+${overTarget.toLocaleString()})`
                              : ` (+${formatPrice(overTarget)})`
                            : ""}
                          {` (${progress.toFixed(1)}%)`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTargetDialog(moderator)}
                        >
                          Set Target
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Moderator Target</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTarget} className="space-y-4">
            <div>
              <Label htmlFor="moderatorName">Moderator</Label>
              <Input
                id="moderatorName"
                value={selectedModerator?.full_name || ""}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="targetMetric">Target Metric</Label>
              <Select
                value={targetMetric}
                onValueChange={(value: "amount" | "orders") =>
                  setTargetMetric(value)
                }
              >
                <SelectTrigger id="targetMetric">
                  <SelectValue placeholder="Choose metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                required
              />
            </div>

            <div>
              <Label htmlFor="targetType">Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(value: "daily" | "weekly" | "monthly") =>
                  setTargetType(value)
                }
              >
                <SelectTrigger id="targetType">
                  <SelectValue placeholder="Choose period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="targetStartDate">Start Date</Label>
                <Input
                  id="targetStartDate"
                  type="date"
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="targetEndDate">End Date</Label>
                <Input
                  id="targetEndDate"
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                saving || targetValue < 1 || !targetStartDate || !targetEndDate
              }
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Target"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
