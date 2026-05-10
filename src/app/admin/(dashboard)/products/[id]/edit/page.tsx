import ProductForm from "@/components/admin/ProductForm";
import { getCurrentUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const role = await getCurrentUserRole();

  if (role === "moderator") {
    redirect("/admin/products");
  }

  const { id } = await params;
  return <ProductForm productId={id} />;
}
