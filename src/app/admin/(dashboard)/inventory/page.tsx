"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Save,
  RefreshCw,
  AlertTriangle,
  Package,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Category, VariantType } from "@/types";
import { useAdminRole } from "@/components/admin/AdminRoleProvider";

interface ProductVariant {
  id: string;
  size: string;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  attributes?: Record<string, string>; // Custom variant attributes
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  category_name: string | null;
  image_url: string | null;
  variants: ProductVariant[];
}

interface SubcategoryData {
  id: string | null;
  name: string;
  products: ProductData[];
  totalStock: number;
  totalCost: number;
  variantTypes?: VariantType[]; // Custom variant types for this subcategory
}

interface CategoryData {
  id: string | null;
  name: string;
  subcategories: SubcategoryData[];
  totalStock: number;
  totalCost: number;
  colorIndex: number;
  variantTypes?: VariantType[]; // Custom variant types for this category
}

interface EditedStock {
  variant_id: string;
  value: number;
}

// Category header colors - different for each category
const CATEGORY_COLORS = [
  "from-blue-600 to-blue-700",
  "from-emerald-600 to-emerald-700",
  "from-purple-600 to-purple-700",
  "from-orange-600 to-orange-700",
  "from-rose-600 to-rose-700",
  "from-cyan-600 to-cyan-700",
  "from-indigo-600 to-indigo-700",
  "from-amber-600 to-amber-700",
  "from-teal-600 to-teal-700",
  "from-pink-600 to-pink-700",
];

const SUBCATEGORY_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-amber-500 to-amber-600",
  "from-teal-500 to-teal-600",
  "from-pink-500 to-pink-600",
];

// Standard sizes order
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "2XL", "3XL"];

function getSizeOrder(size: string): number {
  const idx = SIZE_ORDER.findIndex(
    (s) => s.toLowerCase() === size.toLowerCase(),
  );
  return idx >= 0 ? idx : 999;
}

function formatPrice(price: number): string {
  return `৳${price.toLocaleString()}`;
}

// Get the variant columns to display for a category/subcategory
function getVariantColumns(
  categoryVariantTypes?: VariantType[],
  subcategoryVariantTypes?: VariantType[],
): { key: string; label: string }[] {
  // Use subcategory variant types if available, otherwise use category's
  const variantTypes = subcategoryVariantTypes?.length
    ? subcategoryVariantTypes
    : categoryVariantTypes?.length
      ? categoryVariantTypes
      : null;

  if (!variantTypes || variantTypes.length === 0) {
    // Default columns: Size, Color
    return [
      { key: "size", label: "Size" },
      { key: "color", label: "Color" },
    ];
  }

  // Return columns based on variant types
  return variantTypes.map((vt) => ({
    key: vt.key,
    label: vt.name,
  }));
}

// Get variant value for display
function getVariantValue(variant: ProductVariant, key: string): string | null {
  if (key === "size") return variant.size;
  if (key === "color") return variant.color;
  // Check in attributes for custom variant types
  return variant.attributes?.[key] || null;
}

export default function InventoryPage() {
  const { role } = useAdminRole();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [editedStocks, setEditedStocks] = useState<Map<string, EditedStock>>(
    new Map(),
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());

  const canEditInventory = role !== "moderator";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      // First fetch all categories to build a lookup map for parents and variant options
      const { data: allCategories, error: catError } = await supabase
        .from("categories")
        .select("id, name, parent_id, variant_options");

      if (catError) throw catError;

      // Create a map of category id -> category data with variant options
      interface CategoryLookupData {
        id: string;
        name: string;
        parent_id: string | null;
        variant_options: { variant_types?: VariantType[] } | null;
      }
      const categoryLookup = new Map<string, CategoryLookupData>();
      (allCategories || []).forEach((cat: CategoryLookupData) => {
        categoryLookup.set(cat.id, cat);
      });

      // Fetch all products with variants and category info
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          slug,
          category_id,
          categories (
            id,
            name,
            parent_id,
            variant_options
          ),
          variants:product_variants (
            id,
            size,
            color,
            sku,
            stock_quantity,
            cost_price,
            sale_price,
            attributes
          ),
          images:product_images (
            url,
            is_primary
          )
        `,
        )
        .order("name");

      if (error) throw error;

      // Build hierarchical structure: Category > Subcategory > Products
      const categoriesMap = new Map<string, CategoryData>();

      (products || []).forEach((p: Record<string, unknown>) => {
        const category = p.categories as Record<string, unknown> | null;
        const images =
          (p.images as Array<{ url: string; is_primary: boolean }>) || [];
        const primaryImage = images.find((img) => img.is_primary) || images[0];

        const categoryId = category?.id as string | null;
        const categoryName = (category?.name as string) || "Uncategorized";
        const parentIdFromCategory = category?.parent_id as string | null;
        const categoryVariantOptions = category?.variant_options as {
          variant_types?: VariantType[];
        } | null;

        // Look up parent from our category map
        const parentCat = parentIdFromCategory
          ? categoryLookup.get(parentIdFromCategory)
          : null;
        const parentId = parentCat?.id || null;
        const parentName = parentCat?.name || null;
        const parentVariantOptions = parentCat?.variant_options;

        // Determine hierarchy:
        // If parent exists: Parent = Main Category, Current Category = Subcategory
        // If no parent: Current Category = Main Category, Subcategory = "General"
        let topCategoryId: string;
        let topCategoryName: string;
        let subCategoryId: string | null;
        let subCategoryName: string;
        let topCategoryVariantTypes: VariantType[] | undefined;
        let subCategoryVariantTypes: VariantType[] | undefined;

        if (parentId && parentName) {
          // Has parent - parent is main category, current is subcategory
          topCategoryId = parentId;
          topCategoryName = parentName;
          subCategoryId = categoryId;
          subCategoryName = categoryName;
          topCategoryVariantTypes = parentVariantOptions?.variant_types;
          subCategoryVariantTypes = categoryVariantOptions?.variant_types;
        } else {
          // No parent - current is main category
          topCategoryId = categoryId || "uncategorized";
          topCategoryName = categoryName;
          subCategoryId = null;
          subCategoryName = "General";
          topCategoryVariantTypes = categoryVariantOptions?.variant_types;
          subCategoryVariantTypes = undefined;
        }

        const productData: ProductData = {
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          category_id: categoryId,
          category_name: categoryName,
          image_url: primaryImage?.url || null,
          variants: ((p.variants as ProductVariant[]) || []).sort(
            (a, b) => getSizeOrder(a.size) - getSizeOrder(b.size),
          ),
        };

        // Get or create main category
        if (!categoriesMap.has(topCategoryId)) {
          const colorIndex = categoriesMap.size % CATEGORY_COLORS.length;
          categoriesMap.set(topCategoryId, {
            id: topCategoryId === "uncategorized" ? null : topCategoryId,
            name: topCategoryName,
            subcategories: [],
            totalStock: 0,
            totalCost: 0,
            colorIndex,
            variantTypes: topCategoryVariantTypes,
          });
        }

        const cat = categoriesMap.get(topCategoryId)!;

        // Find or create subcategory
        let subcat = cat.subcategories.find(
          (s) => s.id === subCategoryId || s.name === subCategoryName,
        );
        if (!subcat) {
          subcat = {
            id: subCategoryId,
            name: subCategoryName,
            products: [],
            totalStock: 0,
            totalCost: 0,
            variantTypes: subCategoryVariantTypes,
          };
          cat.subcategories.push(subcat);
        }

        // Add product to subcategory
        subcat.products.push(productData);

        // Calculate totals
        const productStock = productData.variants.reduce(
          (sum, v) => sum + v.stock_quantity,
          0,
        );
        const productCost = productData.variants.reduce(
          (sum, v) => sum + v.stock_quantity * v.cost_price,
          0,
        );

        subcat.totalStock += productStock;
        subcat.totalCost += productCost;
        cat.totalStock += productStock;
        cat.totalCost += productCost;
      });

      // Convert to array and sort
      const categoriesArray = Array.from(categoriesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setCategoryData(categoriesArray);

      // Expand all by default
      setExpandedCategories(
        new Set(categoriesArray.map((c) => c.id || "uncategorized")),
      );
      const allSubcats = new Set<string>();
      categoriesArray.forEach((c) =>
        c.subcategories.forEach((s) =>
          allSubcats.add(`${c.id || "uncategorized"}-${s.id || s.name}`),
        ),
      );
      setExpandedSubcategories(allSubcats);

      // Fetch categories for filter
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setAllCategories((cats as Category[]) || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Get stock value (edited or original)
  const getStockValue = (variantId: string, originalValue: number): number => {
    const edited = editedStocks.get(variantId);
    return edited ? edited.value : originalValue;
  };

  // Calculate totals with edited values
  const calcProductStock = (variants: ProductVariant[]): number => {
    return variants.reduce(
      (sum, v) => sum + getStockValue(v.id, v.stock_quantity),
      0,
    );
  };

  const calcProductCost = (variants: ProductVariant[]): number => {
    return variants.reduce(
      (sum, v) => sum + getStockValue(v.id, v.stock_quantity) * v.cost_price,
      0,
    );
  };

  // Handle stock edit
  const handleStockEdit = (variantId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedStocks((prev) => {
      const updated = new Map(prev);
      updated.set(variantId, { variant_id: variantId, value: numValue });
      return updated;
    });
  };

  // Check if stock is edited
  const isStockEdited = (variantId: string) => {
    return editedStocks.has(variantId);
  };

  // Save all changes
  const saveChanges = async () => {
    if (editedStocks.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const variantMeta = new Map<
        string,
        {
          product_id: string;
          product_name: string;
          stock_before: number;
          cost_price: number;
          variant_label: string;
        }
      >();

      categoryData.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          subcategory.products.forEach((product) => {
            product.variants.forEach((variant) => {
              variantMeta.set(variant.id, {
                product_id: product.id,
                product_name: product.name,
                stock_before: variant.stock_quantity,
                cost_price: Number(variant.cost_price || 0),
                variant_label: `${variant.size}${variant.color ? ` / ${variant.color}` : ""}`,
              });
            });
          });
        });
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updates = Array.from(editedStocks.values()).filter((edit) => {
        const meta = variantMeta.get(edit.variant_id);
        return meta ? meta.stock_before !== edit.value : false;
      });

      const promises = updates.map((edit) =>
        supabase
          .from("product_variants")
          .update({ stock_quantity: edit.value })
          .eq("id", edit.variant_id),
      );

      await Promise.all(promises);

      const historyRows = updates
        .map((edit) => {
          const meta = variantMeta.get(edit.variant_id);
          if (!meta) return null;

          const delta = edit.value - meta.stock_before;
          if (delta === 0) return null;

          return {
            variant_id: edit.variant_id,
            product_id: meta.product_id,
            movement_type: delta > 0 ? "restock" : "manual_adjustment_out",
            quantity_change: delta,
            stock_before: meta.stock_before,
            stock_after: edit.value,
            unit_cost_price: meta.cost_price,
            total_cost_impact: Math.abs(delta) * meta.cost_price,
            source: "admin_inventory",
            note: `Manual stock update for ${meta.product_name} (${meta.variant_label})`,
            created_by: user?.id || null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (historyRows.length > 0) {
        const { error: historyError } = await supabase
          .from("inventory_stock_history")
          .insert(historyRows);

        if (historyError) {
          // Keep stock save successful even if history table is not migrated yet.
          console.warn("Stock history insert skipped:", historyError.message);
        }
      }

      toast.success(`Updated ${editedStocks.size} item(s)`);
      setEditedStocks(new Map());
      fetchInventory();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Toggle expansions
  const toggleCategory = (categoryId: string | null) => {
    const key = categoryId || "uncategorized";
    setExpandedCategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  const toggleSubcategory = (
    categoryId: string | null,
    subcategoryId: string | null,
    subcategoryName: string,
  ) => {
    const key = `${categoryId || "uncategorized"}-${subcategoryId || subcategoryName}`;
    setExpandedSubcategories((prev) => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  // Filter data
  const filteredData = categoryData
    .map((cat) => {
      const filteredSubcats = cat.subcategories
        .map((sub) => {
          let filteredProducts = sub.products;

          // Search filter
          if (search) {
            const searchLower = search.toLowerCase();
            filteredProducts = filteredProducts.filter(
              (p) =>
                p.name.toLowerCase().includes(searchLower) ||
                p.variants.some((v) =>
                  v.sku?.toLowerCase().includes(searchLower),
                ),
            );
          }

          // Category filter
          if (categoryFilter !== "all") {
            filteredProducts = filteredProducts.filter(
              (p) => p.category_id === categoryFilter,
            );
          }

          // Stock filter
          if (stockFilter !== "all") {
            filteredProducts = filteredProducts.filter((p) => {
              const totalStock = calcProductStock(p.variants);
              if (stockFilter === "out") return totalStock === 0;
              if (stockFilter === "low")
                return totalStock > 0 && totalStock <= 10;
              if (stockFilter === "in") return totalStock > 0;
              return true;
            });
          }

          return {
            ...sub,
            products: filteredProducts,
            totalStock: filteredProducts.reduce(
              (sum, p) => sum + calcProductStock(p.variants),
              0,
            ),
            totalCost: filteredProducts.reduce(
              (sum, p) => sum + calcProductCost(p.variants),
              0,
            ),
          };
        })
        .filter((sub) => sub.products.length > 0);

      return {
        ...cat,
        subcategories: filteredSubcats,
        totalStock: filteredSubcats.reduce((sum, s) => sum + s.totalStock, 0),
        totalCost: filteredSubcats.reduce((sum, s) => sum + s.totalCost, 0),
      };
    })
    .filter((cat) => cat.subcategories.length > 0);

  // Calculate size summary for subcategory
  const getSizeSummary = (
    products: ProductData[],
  ): Map<string, { stock: number; cost: number }> => {
    const summary = new Map<string, { stock: number; cost: number }>();
    products.forEach((p) => {
      p.variants.forEach((v) => {
        const current = summary.get(v.size) || { stock: 0, cost: 0 };
        const stock = getStockValue(v.id, v.stock_quantity);
        current.stock += stock;
        current.cost += stock * v.cost_price;
        summary.set(v.size, current);
      });
    });
    return summary;
  };

  // Stats
  const totalStock = filteredData.reduce((sum, c) => sum + c.totalStock, 0);
  const totalCost = filteredData.reduce((sum, c) => sum + c.totalCost, 0);
  const totalProducts = filteredData.reduce(
    (sum, c) =>
      sum + c.subcategories.reduce((ss, sub) => ss + sub.products.length, 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="size-6" />
            Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Category & Subcategory wise stock with cost tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editedStocks.size > 0 && (
            <>
              <Badge variant="secondary" className="mr-2">
                {editedStocks.size} unsaved change(s)
              </Badge>
              {canEditInventory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedStocks(new Map());
                    toast.info("Changes discarded");
                  }}
                >
                  Discard
                </Button>
              )}
            </>
          )}
          {canEditInventory && (
            <Button
              onClick={saveChanges}
              disabled={saving || editedStocks.size === 0}
              size="sm"
            >
              <Save className="size-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditedStocks(new Map());
              fetchInventory();
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold">{filteredData.length}</div>
          <div className="text-xs text-muted-foreground">Categories</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold">{totalProducts}</div>
          <div className="text-xs text-muted-foreground">Products</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{totalStock}</div>
          <div className="text-xs text-muted-foreground">Total Stock</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(totalCost)}
          </div>
          <div className="text-xs text-muted-foreground">Total Cost Value</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        {!canEditInventory && (
          <p className="text-sm text-muted-foreground mb-3">
            View only: moderators cannot update inventory quantities.
          </p>
        )}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name or SKU..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="low">Low Stock (≤10)</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          <RefreshCw className="size-8 animate-spin mx-auto mb-2" />
          Loading inventory...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="size-8 mx-auto mb-2" />
          No inventory items found matching your filters.
        </div>
      ) : (
        /* Category Groups */
        <div className="space-y-4">
          {filteredData.map((category) => {
            const isCatExpanded = expandedCategories.has(
              category.id || "uncategorized",
            );
            const catColor = CATEGORY_COLORS[category.colorIndex];
            const subcatColor = SUBCATEGORY_COLORS[category.colorIndex];

            return (
              <Card
                key={category.id || "uncategorized"}
                className="overflow-hidden"
              >
                {/* Category Header */}
                <div
                  className={`bg-gradient-to-r ${catColor} text-white cursor-pointer p-4`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCatExpanded ? (
                        <ChevronDown className="size-5" />
                      ) : (
                        <ChevronRight className="size-5" />
                      )}
                      <h2 className="text-xl font-bold">{category.name}</h2>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-2xl font-bold">
                          {category.totalStock}
                        </div>
                        <div className="text-xs opacity-80">Total Stock</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {formatPrice(category.totalCost)}
                        </div>
                        <div className="text-xs opacity-80">Total Cost</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                {isCatExpanded && (
                  <div className="divide-y">
                    {category.subcategories.map((subcategory) => {
                      const subKey = `${category.id || "uncategorized"}-${subcategory.id || subcategory.name}`;
                      const isSubExpanded = expandedSubcategories.has(subKey);
                      const sizeSummary = getSizeSummary(subcategory.products);

                      return (
                        <div key={subKey}>
                          {/* Subcategory Header */}
                          {subcategory.name !== "General" && (
                            <div
                              className={`bg-gradient-to-r ${subcatColor} text-white cursor-pointer p-3 pl-8`}
                              onClick={() =>
                                toggleSubcategory(
                                  category.id,
                                  subcategory.id,
                                  subcategory.name,
                                )
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="size-4" />
                                  ) : (
                                    <ChevronRight className="size-4" />
                                  )}
                                  <h3 className="font-semibold">
                                    {subcategory.name}
                                  </h3>
                                  <span className="text-xs opacity-80">
                                    ({subcategory.products.length} products)
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-right text-sm">
                                  <div>
                                    <span className="font-bold">
                                      {subcategory.totalStock}
                                    </span>
                                    <span className="opacity-80 ml-1">
                                      stock
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold">
                                      {formatPrice(subcategory.totalCost)}
                                    </span>
                                    <span className="opacity-80 ml-1">
                                      cost
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Products Table */}
                          {(isSubExpanded || subcategory.name === "General") &&
                            (() => {
                              // Get variant columns for this subcategory
                              const variantColumns = getVariantColumns(
                                category.variantTypes,
                                subcategory.variantTypes,
                              );

                              return (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/60">
                                      <tr className="border-b">
                                        <th className="p-3 text-left font-semibold w-12">
                                          #
                                        </th>
                                        <th className="p-3 text-left font-semibold">
                                          Product Name
                                        </th>
                                        {variantColumns.map((col) => (
                                          <th
                                            key={col.key}
                                            className="p-3 text-center font-semibold w-24"
                                          >
                                            {col.label}
                                          </th>
                                        ))}
                                        <th className="p-3 text-center font-semibold w-28">
                                          Stock
                                        </th>
                                        <th className="p-3 text-right font-semibold w-28">
                                          Cost/Unit
                                        </th>
                                        <th className="p-3 text-right font-semibold w-32">
                                          Total Cost
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {subcategory.products.map(
                                        (product, pIdx) =>
                                          product.variants.map(
                                            (variant, vIdx) => {
                                              const stock = getStockValue(
                                                variant.id,
                                                variant.stock_quantity,
                                              );
                                              const totalCost =
                                                stock * variant.cost_price;
                                              const isEdited = isStockEdited(
                                                variant.id,
                                              );

                                              return (
                                                <tr
                                                  key={variant.id}
                                                  className={`border-b hover:bg-muted/30 ${
                                                    stock === 0
                                                      ? "bg-red-50 dark:bg-red-950/20"
                                                      : stock <= 5
                                                        ? "bg-orange-50 dark:bg-orange-950/20"
                                                        : ""
                                                  }`}
                                                >
                                                  {vIdx === 0 && (
                                                    <>
                                                      <td
                                                        className="p-3 text-muted-foreground"
                                                        rowSpan={
                                                          product.variants
                                                            .length
                                                        }
                                                      >
                                                        {pIdx + 1}
                                                      </td>
                                                      <td
                                                        className="p-3"
                                                        rowSpan={
                                                          product.variants
                                                            .length
                                                        }
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          {product.image_url ? (
                                                            <img
                                                              src={
                                                                product.image_url
                                                              }
                                                              alt={product.name}
                                                              className="size-10 rounded object-cover flex-shrink-0"
                                                            />
                                                          ) : (
                                                            <div className="size-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                                              <Package className="size-5 text-muted-foreground" />
                                                            </div>
                                                          )}
                                                          <span className="font-medium">
                                                            {product.name}
                                                          </span>
                                                        </div>
                                                      </td>
                                                    </>
                                                  )}
                                                  {/* Dynamic variant columns */}
                                                  {variantColumns.map((col) => {
                                                    const value =
                                                      getVariantValue(
                                                        variant,
                                                        col.key,
                                                      );
                                                    return (
                                                      <td
                                                        key={col.key}
                                                        className="p-3 text-center"
                                                      >
                                                        {value ? (
                                                          <Badge
                                                            variant="outline"
                                                            className="font-medium"
                                                          >
                                                            {value}
                                                          </Badge>
                                                        ) : (
                                                          <span className="text-muted-foreground">
                                                            —
                                                          </span>
                                                        )}
                                                      </td>
                                                    );
                                                  })}
                                                  <td className="p-3 text-center">
                                                    <input
                                                      type="number"
                                                      value={stock}
                                                      onChange={(e) =>
                                                        handleStockEdit(
                                                          variant.id,
                                                          e.target.value,
                                                        )
                                                      }
                                                      className={`w-20 text-center font-bold border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary ${
                                                        isEdited
                                                          ? "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400"
                                                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                                                      } ${
                                                        stock === 0
                                                          ? "text-red-600"
                                                          : stock <= 5
                                                            ? "text-orange-500"
                                                            : "text-green-600"
                                                      }`}
                                                      min="0"
                                                      disabled={
                                                        !canEditInventory
                                                      }
                                                    />
                                                  </td>
                                                  <td className="p-3 text-right font-mono">
                                                    {formatPrice(
                                                      variant.cost_price,
                                                    )}
                                                  </td>
                                                  <td className="p-3 text-right font-mono font-semibold">
                                                    {formatPrice(totalCost)}
                                                  </td>
                                                </tr>
                                              );
                                            },
                                          ),
                                      )}
                                    </tbody>
                                    {/* Subcategory Footer - Size Summary */}
                                    <tfoot className="bg-muted/80 font-semibold">
                                      <tr className="border-t-2">
                                        <td
                                          colSpan={2}
                                          className="p-3 text-right font-bold"
                                        >
                                          Size Summary:
                                        </td>
                                        <td
                                          colSpan={variantColumns.length + 3}
                                          className="p-3"
                                        >
                                          <div className="flex flex-wrap gap-3 justify-end items-center">
                                            {Array.from(sizeSummary.entries())
                                              .sort(
                                                (a, b) =>
                                                  getSizeOrder(a[0]) -
                                                  getSizeOrder(b[0]),
                                              )
                                              .map(([size, data]) => (
                                                <div
                                                  key={size}
                                                  className="bg-white dark:bg-gray-800 rounded px-3 py-1 border"
                                                >
                                                  <span className="font-bold text-primary">
                                                    {size}
                                                  </span>
                                                  <span className="text-muted-foreground mx-1">
                                                    :
                                                  </span>
                                                  <span
                                                    className={`font-bold ${data.stock === 0 ? "text-red-600" : "text-green-600"}`}
                                                  >
                                                    {data.stock}
                                                  </span>
                                                </div>
                                              ))}
                                          </div>
                                        </td>
                                      </tr>
                                      <tr className="border-t bg-muted">
                                        <td
                                          colSpan={2 + variantColumns.length}
                                          className="p-3 text-right font-bold text-lg"
                                        >
                                          {subcategory.name !== "General"
                                            ? subcategory.name
                                            : category.name}{" "}
                                          Total:
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className="text-xl font-bold text-blue-600">
                                            {subcategory.totalStock}
                                          </span>
                                          <span className="text-xs text-muted-foreground ml-1">
                                            units
                                          </span>
                                        </td>
                                        <td className="p-3"></td>
                                        <td className="p-3 text-right">
                                          <span className="text-xl font-bold text-green-600">
                                            {formatPrice(subcategory.totalCost)}
                                          </span>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              );
                            })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center">
        Click stock values to edit • Yellow = unsaved changes • Click headers to
        expand/collapse • Each category has a unique color
      </div>
    </div>
  );
}
