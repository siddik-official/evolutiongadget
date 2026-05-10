"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminRole } from "@/types";

interface AdminRoleContextValue {
  role: AdminRole | null;
  profileId: string | null;
  fullName: string | null;
  salesTarget: number;
  loading: boolean;
}

const AdminRoleContext = createContext<AdminRoleContextValue>({
  role: null,
  profileId: null,
  fullName: null,
  salesTarget: 0,
  loading: true,
});

export function useAdminRole() {
  return useContext(AdminRoleContext);
}

export function AdminRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [salesTarget, setSalesTarget] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("admin_profiles")
          .select(
            "id, role, full_name, sales_target, sales_target_type, sales_target_start_date, sales_target_end_date",
          )
          .eq("user_id", user.id)
          .single();

        setRole((profile?.role as AdminRole) ?? null);
        setProfileId(profile?.id ?? null);
        setFullName(profile?.full_name ?? null);
        setSalesTarget(profile?.sales_target ?? 0);
      }
      setLoading(false);
    }

    fetchRole();
  }, []);

  return (
    <AdminRoleContext.Provider
      value={{ role, profileId, fullName, salesTarget, loading }}
    >
      {children}
    </AdminRoleContext.Provider>
  );
}
