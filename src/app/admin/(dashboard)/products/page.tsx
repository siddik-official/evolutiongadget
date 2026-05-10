"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";
import { toast } from "sonner";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";

export default function AdminProductsPage() {
  const { role } = useAdminRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const canManageProducts =
    role === "admin" || role === "super_admin" || role === "storeman";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select(
        "*, category:categories(*), variants:product_variants(*), images:product_images(*)",
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data } = await query;
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setToggling(id);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        toast.error("Failed to update product status");
        return;
      }

      toast.success(
        currentStatus ? "Product unpublished" : "Product published",
      );
      await fetchProducts();
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast.error("Failed to update product status");
    } finally {
      setToggling(null);
    }
  };

  const openDeleteDialog = (id: string, name: string) => {
    setProductToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/products/${productToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();
      console.log("Delete response:", { status: response.status, result });

      if (!response.ok) {
        if (result.code === "HAS_ORDERS") {
          const message =
            "This product has been ordered and cannot be deleted. Please unpublish it instead using the eye icon.";
          toast.error("Cannot Delete Product", {
            description: message,
            duration: 6000,
          });
          // Temporary alert for visibility
          alert(message);
        } else {
          toast.error("Failed to Delete Product", {
            description: result.error || "An error occurred",
            duration: 5000,
          });
          alert(`Error: ${result.error || "An error occurred"}`);
        }
        return;
      }

      toast.success("Product deleted successfully");
      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product", {
        description: "Please try again later",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const getVariantPriceRange = (variants?: Product["variants"]) => {
    if (!variants || variants.length === 0) return "No variants";
    const prices = variants.map((v) => v.discount_price ?? v.sale_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max
      ? formatPrice(min)
      : `${formatPrice(min)} - ${formatPrice(max)}`;
  };

  const getTotalStock = (variants?: Product["variants"]) => {
    if (!variants) return 0;
    return variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        {canManageProducts && (
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4 mr-2" /> Add Product
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products found.</p>
              {canManageProducts && (
                <Button asChild>
                  <Link href="/admin/products/new">Add Your First Product</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="size-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.team || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category?.name || "Uncategorized"}
                      </TableCell>
                      <TableCell>
                        {getVariantPriceRange(product.variants)}
                      </TableCell>
                      <TableCell>{getTotalStock(product.variants)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={product.is_active ? "default" : "secondary"}
                        >
                          {product.is_active ? "Active" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canManageProducts && (
                            <>
                              <Button size="icon" variant="ghost" asChild>
                                <Link
                                  href={`/admin/products/${product.id}/edit`}
                                >
                                  <Edit className="size-4" />
                                </Link>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleToggleActive(
                                    product.id,
                                    product.is_active,
                                  )
                                }
                                disabled={toggling === product.id}
                                title={
                                  product.is_active ? "Unpublish" : "Publish"
                                }
                              >
                                {product.is_active ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  openDeleteDialog(product.id, product.name)
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{productToDelete?.name}</strong>? This action cannot be
              undone. Products that have been ordered cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
