import { createAdminClient } from "@/lib/supabase/admin";
import { ModeratorsSummaryClient } from "@/components/admin/ModeratorsSummaryClient";

export default async function ModeratorsSummaryPage() {
  const adminClient = createAdminClient();

  const { data: profilesData } = await adminClient
    .from("admin_profiles")
    .select(
      "id, user_id, full_name, sales_target, sales_target_metric, sales_target_type, sales_target_start_date, sales_target_end_date",
    )
    .eq("role", "moderator")
    .order("created_at", { ascending: false });

  const moderators = profilesData || [];
  const moderatorIds = moderators.map((moderator) => moderator.id);

  let orders: Array<{
    created_by_profile_id: string | null;
    recommended_by_profile_id: string | null;
    total: number;
    status: string;
    created_at: string;
  }> = [];

  if (moderatorIds.length > 0) {
    // Fetch orders created by OR recommended by moderators
    const { data: ordersData } = await adminClient
      .from("orders")
      .select("created_by_profile_id, recommended_by_profile_id, total, status, created_at")
      .or(`created_by_profile_id.in.(${moderatorIds.join(",")}),recommended_by_profile_id.in.(${moderatorIds.join(",")})`);

    orders = ordersData || [];
  }

  return (
    <ModeratorsSummaryClient
      initialModerators={moderators}
      initialOrders={orders}
    />
  );
}
