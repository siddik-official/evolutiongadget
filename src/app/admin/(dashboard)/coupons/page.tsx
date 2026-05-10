"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Ticket,
  Save,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { DISCOUNT_TYPES } from "@/lib/constants";
import type { Coupon, DiscountType } from "@/types";

interface CouponFormData {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_public: boolean;
}

const getEmptyForm = (): CouponFormData => ({
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order_amount: 0,
  max_discount: null,
  usage_limit: null,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: "",
  is_active: true,
  is_public: false,
});

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>(getEmptyForm());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons?all=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCoupons(data);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(getEmptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount,
      usage_limit: coupon.usage_limit,
      valid_from: coupon.valid_from
        ? new Date(coupon.valid_from).toISOString().slice(0, 16)
        : "",
      valid_until: coupon.valid_until
        ? new Date(coupon.valid_until).toISOString().slice(0, 16)
        : "",
      is_active: coupon.is_active,
      is_public: coupon.is_public,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    if (!form.discount_value || form.discount_value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    if (form.discount_type === "percentage" && form.discount_value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      };

      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/coupons/${editingId}` : "/api/coupons";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success(editingId ? "Coupon updated!" : "Coupon created!");
      setDialogOpen(false);
      fetchCoupons();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete coupon "${code}"? This action cannot be undone.`))
      return;

    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      toast.success("Coupon deleted");
      fetchCoupons();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active)
      return { label: "Inactive", variant: "secondary" as const };

    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { label: "Expired", variant: "destructive" as const };
    }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { label: "Scheduled", variant: "outline" as const };
    }
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { label: "Limit Reached", variant: "secondary" as const };
    }
    return { label: "Active", variant: "default" as const };
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return formatPrice(coupon.discount_value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="size-6" />
            Coupons
          </h1>
          <p className="text-muted-foreground text-sm">
            Create and manage discount coupons for your customers
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="size-4 mr-2" />
          Add Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>
            Manage coupon codes, discounts, and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Loading coupons...
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coupons found. Create your first coupon to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(coupon.code, coupon.id)}
                          >
                            {copiedId === coupon.id ? (
                              <Check className="size-3 text-green-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                          {coupon.is_public && (
                            <Badge variant="outline" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatDiscount(coupon)}
                        </span>
                        {coupon.discount_type === "percentage" &&
                          coupon.max_discount && (
                            <span className="text-xs text-muted-foreground block">
                              Max: {formatPrice(coupon.max_discount)}
                            </span>
                          )}
                      </TableCell>
                      <TableCell>
                        {coupon.min_order_amount > 0
                          ? formatPrice(coupon.min_order_amount)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {coupon.usage_limit
                          ? `${coupon.used_count} / ${coupon.usage_limit}`
                          : `${coupon.used_count} / ∞`}
                      </TableCell>
                      <TableCell>
                        {coupon.valid_until
                          ? new Date(coupon.valid_until).toLocaleDateString()
                          : "No expiry"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Coupon" : "Add Coupon"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Coupon Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. SAVE20"
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g. 20% off on all jerseys"
                />
              </div>
            </div>

            {/* Discount Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      discount_type: val as DiscountType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Discount Value *{" "}
                  {form.discount_type === "percentage" ? "(%)" : "(৳)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={form.discount_type === "percentage" ? 100 : undefined}
                  step={form.discount_type === "percentage" ? 1 : 0.01}
                  value={form.discount_value || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discount_value: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              {form.discount_type === "percentage" && (
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label>Max Discount (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.max_discount || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_discount: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="No limit"
                  />
                </div>
              )}
            </div>

            {/* Minimum Order & Usage Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Min Order Amount (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.min_order_amount || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      min_order_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0 (no minimum)"
                />
              </div>
              <div>
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usage_limit || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usage_limit: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valid_from: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      valid_until: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={form.is_public}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_public: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Label htmlFor="is_public" className="text-sm">
                  Public (visible on checkout)
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
