"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_ROLES } from "@/lib/constants";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  sales_target: number;
  sales_target_metric: "amount" | "orders" | null;
  sales_target_type: "daily" | "weekly" | "monthly" | null;
  sales_target_start_date: string | null;
  sales_target_end_date: string | null;
  email: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingTarget, setUpdatingTarget] = useState<string | null>(null);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [targetValue, setTargetValue] = useState(0);
  const [targetMetric, setTargetMetric] = useState<"amount" | "orders">(
    "amount",
  );
  const [targetType, setTargetType] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [targetStartDate, setTargetStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(
        data.message ||
          "User invited successfully. Verification email sent to the user.",
      );
      setDialogOpen(false);
      setEmail("");
      setFullName("");
      setRole("");
      fetchUsers();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openTargetDialog = (user: UserProfile) => {
    setTargetUser(user);
    setTargetValue(user.sales_target || 0);
    setTargetMetric(user.sales_target_metric || "amount");
    setTargetType(user.sales_target_type || "monthly");
    setTargetStartDate(user.sales_target_start_date || "");
    setTargetEndDate(user.sales_target_end_date || "");
    setTargetDialogOpen(true);
  };

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    setUpdatingTarget(targetUser.user_id);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sales_target: targetValue,
          sales_target_metric: targetMetric,
          sales_target_type: targetType,
          sales_target_start_date: targetStartDate,
          sales_target_end_date: targetEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update sales target");
        return;
      }

      toast.success("Sales target updated");
      setTargetDialogOpen(false);
      setTargetUser(null);
      setTargetStartDate("");
      setTargetEndDate("");
      fetchUsers();
    } catch {
      toast.error("Failed to update sales target");
    } finally {
      setUpdatingTarget(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setDeleting(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }

      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(null);
    }
  };

  const getRoleBadge = (roleValue: string) => {
    const roleConfig = ADMIN_ROLES.find((r) => r.value === roleValue);
    return (
      <Badge variant="secondary" className={roleConfig?.color || ""}>
        {roleConfig?.label || roleValue}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage admin panel users</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground rounded-md border bg-muted/50 p-3">
                  User will receive a verification email from Supabase. They can
                  set their password by completing the invite link.
                </p>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="storeman">Storeman</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={creating || !role || !email || !fullName}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Invite User"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sales Target</TableHead>
                <TableHead>Target Period</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.role === "moderator"
                        ? u.sales_target_metric === "orders"
                          ? `${Number(u.sales_target || 0).toLocaleString()} orders`
                          : `৳${Number(u.sales_target || 0).toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {u.role === "moderator"
                        ? u.sales_target_type &&
                          u.sales_target_start_date &&
                          u.sales_target_end_date
                          ? `${u.sales_target_type} (${u.sales_target_start_date} to ${u.sales_target_end_date})`
                          : "Not set"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {u.role === "moderator" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTargetDialog(u)}
                            disabled={updatingTarget === u.user_id}
                          >
                            Target
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(u.user_id)}
                          disabled={deleting === u.user_id}
                        >
                          {deleting === u.user_id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Sales Target</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTarget} className="space-y-4">
            <div>
              <Label htmlFor="targetUser">Moderator</Label>
              <Input
                id="targetUser"
                value={targetUser?.full_name || ""}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="targetAmount">Sales Target</Label>
              <Input
                id="targetAmount"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                required
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
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectValue placeholder="Select target type" />
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
                !!updatingTarget ||
                targetValue < 1 ||
                !targetStartDate ||
                !targetEndDate
              }
            >
              {updatingTarget ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Updating...
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
