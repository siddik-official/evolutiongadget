"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, User, Lock } from "lucide-react";
import { toast } from "sonner";

export default function UserProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current user info
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
        // Try to get full name from user metadata
        const displayName = user.user_metadata?.full_name || user.email || "";
        setFullName(displayName);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setNameSaving(true);

    try {
      const supabase = createClient();

      // Check session before updating
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) {
        console.error("Update name error:", error);
        toast.error(error.message || "Failed to update name");
        return;
      }

      toast.success("Name updated successfully!");
    } catch (err) {
      console.error("Error updating name:", err);
      toast.error("An error occurred while updating name");
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);

    try {
      const supabase = createClient();

      // Get current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      // Call server API to change password
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error changing password:", err);
      toast.error("An error occurred while changing password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {/* Email Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Email Address</Label>
            <p className="text-sm font-medium mt-2">{email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your email is verified and used for login
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Update Name */}
      <Card className="mb-6 max-w-md">
        <CardHeader>
          <CardTitle>Update Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={nameSaving || !fullName.trim()}
            >
              {nameSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Name"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters
            </p>

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={
                passwordLoading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
