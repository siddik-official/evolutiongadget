import ProductForm from "@/components/admin/ProductForm";
import { getCurrentUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const role = await getCurrentUserRole();

  if (role === "moderator") {
    redirect("/admin/products");
  }

  return <ProductForm />;
}
