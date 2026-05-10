"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePOSStore } from "@/store/pos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CheckCircle,
  Scissors,
  Percent,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import type { Product, Category, VariantType } from "@/types";

// Extended product variant with attributes
interface ProductVariantExtended {
  id: string;
  size: string;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  discount_price: number | null;
  is_active: boolean;
  attributes?: Record<string, string>;
}

interface CategoryWithProducts {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  variant_options?: { variant_types?: VariantType[] };
  products: Product[];
  subcategories?: CategoryWithProducts[];
}

// Helper to get variant value from attributes or standard fields
function getVariantDisplayValue(
  variant: ProductVariantExtended,
  key: string
): string | null {
  if (key === "size") return variant.size;
  if (key === "color") return variant.color;
  return variant.attributes?.[key] || null;
}

// ProductCard component with dynamic variant display
function ProductCard({
  product,
  variantTypes,
  isExpanded,
  onToggleExpand,
  onAddVariant,
}: {
  product: Product;
  variantTypes?: VariantType[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddVariant: (variant: ProductVariantExtended) => void;
}) {
  const primaryImage = product.images?.find((img) => img.is_primary);
  const image = primaryImage || product.images?.[0];
  const activeVariants = (product.variants as ProductVariantExtended[] || []).filter(
    (v) => v.is_active && v.stock_quantity > 0
  );

  // Determine which variant columns to show
  const displayColumns = variantTypes?.length
    ? variantTypes.map((vt) => ({ key: vt.key, label: vt.name }))
    : [
        { key: "size", label: "Size" },
        { key: "color", label: "Color" },
      ];

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${isExpanded ? "ring-2 ring-primary" : ""}`}
      onClick={onToggleExpand}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {image && (
            <img
              src={image.url}
              alt={product.name}
              className="size-16 rounded-md object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.name}</p>
            {product.team && (
              <p className="text-xs text-muted-foreground">{product.team}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeVariants.length} variant(s) in stock
            </p>
          </div>
        </div>

        {isExpanded && activeVariants.length > 0 && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {activeVariants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {displayColumns.map((col) => {
                    const value = getVariantDisplayValue(variant, col.key);
                    if (!value) return null;
                    return (
                      <Badge key={col.key} variant="outline" className="text-xs">
                        {col.label}: {value}
                      </Badge>
                    );
                  })}
                  <span className="text-muted-foreground text-xs">
                    ({variant.stock_quantity} in stock)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatPrice(variant.discount_price ?? variant.sale_price)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddVariant(variant);
                    }}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && activeVariants.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2 border-t mt-3 pt-3">
            No variants in stock
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<CategoryWithProducts[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Store settings
  const [customizationEnabled, setCustomizationEnabled] = useState(false);
  const [customizationPrice, setCustomizationPrice] = useState(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null); // For expanding customization/discount UI

  const {
    items,
    customerName,
    customerPhone,
    paymentMethod,
    onlinePaymentDetails,
    customizations,
    itemDiscounts,
    customizationDiscounts,
    addItem,
    removeItem,
    updateQuantity,
    setCustomerName,
    setCustomerPhone,
    setPaymentMethod,
    setOnlinePaymentDetails,
    setCustomization,
    setItemDiscount,
    setCustomizationDiscount,
    clearSale,
    subtotal,
    totalItems,
    getCustomizationCount,
    getTotalDiscount,
  } = usePOSStore();

  // Fetch store settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/store");
        if (res.ok) {
          const data = await res.json();
          setCustomizationEnabled(data.customization_enabled === "true");
          setCustomizationPrice(
            parseFloat(data.customization_price || "0") || 0,
          );
        }
      } catch {
        // Settings fetch failed, keep defaults
      }
    };
    fetchSettings();
  }, []);

  // Fetch products grouped by category on mount
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      setLoadingCategories(true);
      try {
        // Fetch categories with hierarchy
        const catRes = await fetch("/api/categories");
        const categories: Category[] = catRes.ok ? await catRes.json() : [];
        
        // Fetch all active products with variants
        const prodRes = await fetch("/api/products?limit=1000");
        const allProducts: Product[] = prodRes.ok ? await prodRes.json() : [];
        
        // Build category lookup
        const categoryMap = new Map<string, Category>();
        categories.forEach(cat => categoryMap.set(cat.id, cat));
        
        // Group products by top-level category
        const grouped = new Map<string, CategoryWithProducts>();
        
        allProducts.forEach(product => {
          if (!product.category_id) return;
          
          const category = categoryMap.get(product.category_id);
          if (!category) return;
          
          // Determine top-level category and subcategory
          let topCategoryId: string;
          let topCategoryName: string;
          let subCategory: CategoryWithProducts | null = null;
          
          if (category.parent_id) {
            // Has parent - parent is top category
            const parentCat = categoryMap.get(category.parent_id);
            if (parentCat) {
              topCategoryId = parentCat.id;
              topCategoryName = parentCat.name;
              subCategory = {
                id: category.id,
                name: category.name,
                slug: category.slug,
                parent_id: category.parent_id,
                variant_options: category.variant_options,
                products: [],
              };
            } else {
              topCategoryId = category.id;
              topCategoryName = category.name;
            }
          } else {
            topCategoryId = category.id;
            topCategoryName = category.name;
          }
          
          // Get or create top category
          if (!grouped.has(topCategoryId)) {
            const topCat = categoryMap.get(topCategoryId);
            grouped.set(topCategoryId, {
              id: topCategoryId,
              name: topCategoryName,
              slug: topCat?.slug || topCategoryId,
              parent_id: null,
              variant_options: topCat?.variant_options,
              products: [],
              subcategories: [],
            });
          }
          
          const topGroup = grouped.get(topCategoryId)!;
          
          if (subCategory) {
            // Add to subcategory
            let existingSub = topGroup.subcategories?.find(s => s.id === subCategory!.id);
            if (!existingSub) {
              existingSub = { ...subCategory, products: [] };
              topGroup.subcategories = topGroup.subcategories || [];
              topGroup.subcategories.push(existingSub);
            }
            existingSub.products.push(product);
          } else {
            // Add directly to top category
            topGroup.products.push(product);
          }
        });
        
        // Convert to array and sort
        const result = Array.from(grouped.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        // Sort subcategories and products
        result.forEach(cat => {
          cat.subcategories?.sort((a, b) => a.name.localeCompare(b.name));
          cat.products.sort((a, b) => a.name.localeCompare(b.name));
          cat.subcategories?.forEach(sub => {
            sub.products.sort((a, b) => a.name.localeCompare(b.name));
          });
        });
        
        setCategoryProducts(result);
        
        // Auto-expand first category
        if (result.length > 0) {
          setExpandedCategories(new Set([result[0].id]));
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategoryProducts();
  }, []);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleSubcategory = (subId: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      return next;
    });
  };

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(query)}&limit=12`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      toast.error("Failed to search products");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchProducts]);

  const handleAddVariant = (
    product: Product,
    variant: ProductVariantExtended,
  ) => {
    if (!variant) return;
    const primaryImage = product.images?.find((img) => img.is_primary);
    const firstImage = product.images?.[0];

    addItem({
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_size: variant.size,
      variant_color: variant.color,
      variant_attributes: variant.attributes || null,
      quantity: 1,
      unit_price: variant.discount_price ?? variant.sale_price,
      image_url: primaryImage?.url || firstImage?.url || null,
    });

    toast.success(`Added ${product.name} (${variant.size})`);
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error("Add items to the sale first");
      return;
    }

    setCompleting(true);
    try {
      // Build customization notes for each item
      const itemsWithCustomization = items.map((item) => {
        const units = customizations[item.variant_id] || [];
        const filledUnits = units
          .map((u, idx) => ({ u, idx }))
          .filter(({ u }) => u?.name?.trim() || u?.number?.trim());

        let custNote: string | null = null;
        if (filledUnits.length > 0) {
          if (filledUnits.length === 1 && item.quantity === 1) {
            const { u } = filledUnits[0];
            custNote = `Name: ${u.name.trim() || "-"}, Number: ${u.number.trim() || "-"}`;
          } else {
            custNote = filledUnits
              .map(
                ({ u, idx }) =>
                  `Jersey ${idx + 1}: Name: ${u.name.trim() || "-"}, Number: ${u.number.trim() || "-"}`,
              )
              .join(" | ");
          }
        }

        return {
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_size: item.variant_size,
          variant_color: item.variant_color,
          variant_attributes: item.variant_attributes,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customization_note: custNote,
          item_discount: itemDiscounts[item.variant_id] || 0,
          customization_discount: customizationDiscounts[item.variant_id] || 0,
        };
      });

      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsWithCustomization,
          customer_name: customerName || undefined,
          customer_phone: customerPhone || undefined,
          payment_method: paymentMethod,
          online_payment_details:
            paymentMethod === "online" ? onlinePaymentDetails : undefined,
          customization_price: customizationPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(`Sale completed! Order: ${data.order_number}`);
      clearSale();
      setProducts([]);
      setSearchQuery("");
      setExpandedProduct(null);
      setExpandedItem(null);
    } catch {
      toast.error("Failed to complete sale");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground">Process in-store sales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, team, or league..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {searching && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}

          {!searching && products.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          )}

          {/* Search Results */}
          {!searching && products.length > 0 && searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isExpanded={expandedProduct === product.id}
                  onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                  onAddVariant={(variant) => handleAddVariant(product, variant)}
                />
              ))}
            </div>
          )}

          {/* Category Browse - when no search */}
          {!searching && !searchQuery && (
            <div className="space-y-4">
              {loadingCategories ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="size-12 mx-auto mb-3 opacity-50" />
                  <p>No products available</p>
                </div>
              ) : (
                categoryProducts.map((category) => {
                  const isCatExpanded = expandedCategories.has(category.id);
                  const totalProducts = category.products.length + 
                    (category.subcategories?.reduce((sum, sub) => sum + sub.products.length, 0) || 0);
                  
                  return (
                    <Card key={category.id} className="overflow-hidden">
                      {/* Category Header */}
                      <div
                        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 cursor-pointer"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCatExpanded ? (
                              <ChevronDown className="size-5" />
                            ) : (
                              <ChevronRight className="size-5" />
                            )}
                            <FolderOpen className="size-5" />
                            <h2 className="font-bold text-lg">{category.name}</h2>
                            <Badge variant="secondary" className="ml-2">
                              {totalProducts} products
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {isCatExpanded && (
                        <CardContent className="p-3 space-y-4">
                          {/* Direct products in category */}
                          {category.products.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {category.products.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                  variantTypes={category.variant_options?.variant_types}
                                  isExpanded={expandedProduct === product.id}
                                  onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                  onAddVariant={(variant) => handleAddVariant(product, variant)}
                                />
                              ))}
                            </div>
                          )}

                          {/* Subcategories */}
                          {category.subcategories?.map((subcategory) => {
                            const isSubExpanded = expandedSubcategories.has(subcategory.id);
                            
                            return (
                              <div key={subcategory.id} className="border rounded-lg overflow-hidden">
                                {/* Subcategory Header */}
                                <div
                                  className="bg-muted/60 p-2 cursor-pointer"
                                  onClick={() => toggleSubcategory(subcategory.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {isSubExpanded ? (
                                        <ChevronDown className="size-4" />
                                      ) : (
                                        <ChevronRight className="size-4" />
                                      )}
                                      <span className="font-semibold">{subcategory.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {subcategory.products.length}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {isSubExpanded && subcategory.products.length > 0 && (
                                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {subcategory.products.map((product) => (
                                      <ProductCard
                                        key={product.id}
                                        product={product}
                                        variantTypes={subcategory.variant_options?.variant_types || category.variant_options?.variant_types}
                                        isExpanded={expandedProduct === product.id}
                                        onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                        onAddVariant={(variant) => handleAddVariant(product, variant)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right: Current Sale */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Current Sale
                {totalItems() > 0 && (
                  <Badge variant="secondary">{totalItems()} items</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items added yet
                </p>
              ) : (
                <>
                  {items.map((item) => {
                    const isItemExpanded = expandedItem === item.variant_id;
                    const itemDiscount = itemDiscounts[item.variant_id] || 0;
                    const customizationDiscount =
                      customizationDiscounts[item.variant_id] || 0;
                    const units = customizations[item.variant_id] || [];
                    const customizedCount = units.filter(
                      (u) => u?.name?.trim() || u?.number?.trim(),
                    ).length;

                    return (
                      <div key={item.variant_id} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatVariantShort(item.variant_size, item.variant_attributes)}
                              {item.variant_color
                                ? ` / ${item.variant_color}`
                                : ""}
                              {" · "}
                              {itemDiscount > 0 ? (
                                <>
                                  <span className="line-through">
                                    {formatPrice(item.unit_price)}
                                  </span>{" "}
                                  <span className="text-green-600 font-medium">
                                    {formatPrice(
                                      item.unit_price - itemDiscount,
                                    )}
                                  </span>
                                </>
                              ) : (
                                formatPrice(item.unit_price)
                              )}
                            </p>
                            {customizedCount > 0 && (
                              <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                                <Scissors className="size-3" />
                                {customizedCount} customized
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                updateQuantity(
                                  item.variant_id,
                                  item.quantity - 1,
                                )
                              }
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-xs">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                updateQuantity(
                                  item.variant_id,
                                  item.quantity + 1,
                                )
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive"
                              onClick={() => removeItem(item.variant_id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Expand button for customization and discount */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() =>
                            setExpandedItem(
                              isItemExpanded ? null : item.variant_id,
                            )
                          }
                        >
                          {isItemExpanded ? "Hide" : "Show"} Options
                          <Scissors className="size-3 ml-1" />
                          <Percent className="size-3 ml-1" />
                        </Button>

                        {/* Customization and Discount UI */}
                        {isItemExpanded && (
                          <div className="space-y-3 p-3 bg-muted/50 rounded-md border">
                            {/* Discount Controls */}
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold flex items-center gap-1">
                                <Percent className="size-3" />
                                Discounts
                              </Label>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Product Discount (৳)
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_price}
                                    step="10"
                                    value={itemDiscount}
                                    onChange={(e) =>
                                      setItemDiscount(
                                        item.variant_id,
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="h-7 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                                {customizationEnabled &&
                                  customizationPrice > 0 && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">
                                        Customization Discount (৳)
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={customizationPrice}
                                        step="10"
                                        value={customizationDiscount}
                                        onChange={(e) =>
                                          setCustomizationDiscount(
                                            item.variant_id,
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        className="h-7 text-xs"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Customization Controls */}
                            {customizationEnabled && customizationPrice > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                  <Scissors className="size-3" />
                                  Jersey Customization
                                  <span className="ml-auto text-muted-foreground font-normal">
                                    {formatPrice(
                                      customizationPrice -
                                        customizationDiscount,
                                    )}
                                    /jersey
                                  </span>
                                </Label>
                                {Array.from({ length: item.quantity }).map(
                                  (_, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                      {item.quantity > 1 && (
                                        <p className="text-xs font-medium text-muted-foreground">
                                          Jersey {idx + 1}
                                        </p>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">
                                            Name
                                          </Label>
                                          <Input
                                            placeholder="e.g. MESSI"
                                            value={units[idx]?.name || ""}
                                            onChange={(e) =>
                                              setCustomization(
                                                item.variant_id,
                                                idx,
                                                "name",
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs uppercase"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">
                                            Number
                                          </Label>
                                          <Input
                                            placeholder="e.g. 10"
                                            value={units[idx]?.number || ""}
                                            onChange={(e) =>
                                              setCustomization(
                                                item.variant_id,
                                                idx,
                                                "number",
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items Total</span>
                      <span>
                        {formatPrice(
                          items.reduce(
                            (sum, i) => sum + i.unit_price * i.quantity,
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    {customizationEnabled && getCustomizationCount() > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Scissors className="size-3" />
                          Customization ({getCustomizationCount()})
                        </span>
                        <span>
                          {formatPrice(
                            getCustomizationCount() * customizationPrice,
                          )}
                        </span>
                      </div>
                    )}
                    {getTotalDiscount(customizationPrice) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Percent className="size-3" />
                          Total Discount
                        </span>
                        <span>
                          -{formatPrice(getTotalDiscount(customizationPrice))}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{formatPrice(subtotal(customizationPrice))}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Customer Info (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="pos-name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="pos-name"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="pos-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="pos-phone"
                  placeholder="01XXXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setPaymentMethod(v as "cash" | "online")
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === "online" && (
                <div>
                  <Label className="text-xs">Payment Details</Label>
                  <Input
                    placeholder="e.g., bKash, Nagad, Bank Transfer"
                    value={onlinePaymentDetails}
                    onChange={(e) => setOnlinePaymentDetails(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleCompleteSale}
              disabled={items.length === 0 || completing}
            >
              {completing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Complete Sale ({formatPrice(subtotal(customizationPrice))})
                </>
              )}
            </Button>
            {items.length > 0 && (
              <Button variant="outline" className="w-full" onClick={clearSale}>
                Clear Sale
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
