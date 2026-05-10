import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminRoleProvider } from "@/components/admin/AdminRoleProvider";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoleProvider>
      <div className="min-h-screen bg-muted/30">
        <AdminSidebar />
        <div className="lg:pl-64">
          <div className="pt-16 lg:pt-0">
            <main className="p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </div>
    </AdminRoleProvider>
  );
}
