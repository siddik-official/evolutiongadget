"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { PRODUCT_SIZES, JERSEY_COLORS } from "@/lib/constants";
import type {
  Category,
  Product,
  ProductVariant,
  VariantOptions,
  VariantType,
} from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import ImageUpload, { UploadedImage } from "@/components/admin/ImageUpload";

interface ProductFormProps {
  productId?: string;
}

interface VariantRow {
  id?: string;
  size: string;
  color: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  discount_price: number | null;
  discount_type: "flat" | "percentage";
  stock_quantity: number;
  is_active: boolean;
  attributes: Record<string, string>; // Custom variant attributes
}

const emptyVariant: VariantRow = {
  size: "M",
  color: "",
  sku: "",
  cost_price: 0,
  sale_price: 0,
  discount_price: null,
  discount_type: "flat",
  stock_quantity: 0,
  is_active: true,
  attributes: {},
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const normalizeDiscountInput = (
  salePrice: number,
  finalDiscountPrice: number | null,
  discountType: "flat" | "percentage",
): number | null => {
  if (
    finalDiscountPrice === null ||
    salePrice <= 0 ||
    finalDiscountPrice >= salePrice
  ) {
    return null;
  }

  const discountDifference = salePrice - finalDiscountPrice;
  if (discountDifference <= 0) return null;

  if (discountType === "percentage") {
    return roundCurrency((discountDifference / salePrice) * 100);
  }

  return roundCurrency(discountDifference);
};

const hasSameDiscountInput = (a: number | null, b: number | null) => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.01;
};

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(productId);

  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category_id: "",
    team: "",
    league: "",
    season: "",
    brand: "",
    tags: "",
    is_featured: false,
    is_active: true,
  });

  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);

  // Unified pricing - same price for all variants
  const [unifiedPricing, setUnifiedPricing] = useState(true);
  const [sharedPrices, setSharedPrices] = useState({
    cost_price: 0,
    sale_price: 0,
    discount_price: null as number | null,
    discount_type: "flat" as "flat" | "percentage",
  });

  // Auto-generate SKU
  const [autoSku, setAutoSku] = useState(true);

  // Category-specific variant options (including custom types)
  const [variantOptions, setVariantOptions] = useState<{
    sizes: string[];
    colors: string[];
    size_label: string;
    color_label: string;
    customTypes: VariantType[]; // Additional custom variant types
  }>({
    sizes: [...PRODUCT_SIZES],
    colors: [...JERSEY_COLORS],
    size_label: "Size",
    color_label: "Color",
    customTypes: [],
  });

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories?all=true", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }

        const data = (await response.json()) as Category[];
        setCategories(data);
      } catch {
        const { data } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .order("name");
        setCategories(data || []);
      }
    };

    void loadCategories();
  }, [supabase]);

  // Update variant options when category changes
  useEffect(() => {
    if (!form.category_id) {
      setVariantOptions({
        sizes: [...PRODUCT_SIZES],
        colors: [...JERSEY_COLORS],
        size_label: "Size",
        color_label: "Color",
        customTypes: [],
      });
      return;
    }

    const category = categories.find((c) => c.id === form.category_id);
    if (category?.variant_options) {
      const opts = category.variant_options as VariantOptions;

      // Extract custom types (exclude size and color)
      const customTypes = (opts.variant_types || []).filter(
        (t) => t.key !== "size" && t.key !== "color",
      );

      // Get size/color from variant_types or legacy fields
      const sizeType = opts.variant_types?.find((t) => t.key === "size");
      const colorType = opts.variant_types?.find((t) => t.key === "color");

      setVariantOptions({
        sizes: sizeType?.values?.length
          ? sizeType.values
          : opts.sizes?.length
            ? opts.sizes
            : [...PRODUCT_SIZES],
        colors: colorType?.values?.length
          ? colorType.values
          : opts.colors?.length
            ? opts.colors
            : [...JERSEY_COLORS],
        size_label: sizeType?.name || opts.size_label || "Size",
        color_label: colorType?.name || opts.color_label || "Color",
        customTypes: customTypes,
      });
    } else {
      setVariantOptions({
        sizes: [...PRODUCT_SIZES],
        colors: [...JERSEY_COLORS],
        size_label: "Size",
        color_label: "Color",
        customTypes: [],
      });
    }
  }, [form.category_id, categories]);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const response = await fetch(`/api/admin/products/${productId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        toast.error("Failed to load product");
        return;
      }

      const product = await response.json();
      if (!product) return;

      const p = product as Product & {
        category?: Category | Category[] | null;
      };

      const categoryRelationRaw = p.category;
      const categoryRelation = Array.isArray(categoryRelationRaw)
        ? categoryRelationRaw[0]
        : categoryRelationRaw;
      const resolvedCategoryId = p.category_id || categoryRelation?.id || "";

      if (
        categoryRelation &&
        typeof categoryRelation === "object" &&
        "id" in categoryRelation
      ) {
        const resolvedCategory = categoryRelation as Category;
        setCategories((prev) =>
          prev.some((category) => category.id === resolvedCategory.id)
            ? prev
            : [...prev, resolvedCategory],
        );
      }

      setForm({
        name: p.name,
        slug: p.slug,
        description: p.description || "",
        category_id: resolvedCategoryId,
        team: p.team || "",
        league: p.league || "",
        season: p.season || "",
        brand: p.brand || "",
        tags: p.tags?.join(", ") || "",
        is_featured: p.is_featured,
        is_active: p.is_active,
      });

      if (p.variants && p.variants.length > 0) {
        const loadedVariants: VariantRow[] = p.variants.map(
          (v: ProductVariant) => {
            const discountType: "flat" | "percentage" =
            v.discount_type === "percentage" ? "percentage" : "flat";

            return {
              id: v.id,
              size: v.size,
              color: v.color || "",
              sku: v.sku || "",
              cost_price: v.cost_price,
              sale_price: v.sale_price,
              discount_price: normalizeDiscountInput(
                v.sale_price,
                v.discount_price,
                discountType,
              ),
              discount_type: discountType,
              stock_quantity: v.stock_quantity,
              is_active: v.is_active,
              attributes: v.attributes || {},
            };
          },
        );
        setVariants(loadedVariants);

        // Update sharedPrices with the first variant's prices for unified pricing mode
        const firstVariant = loadedVariants[0];
        if (firstVariant) {
          setSharedPrices({
            cost_price: firstVariant.cost_price || 0,
            sale_price: firstVariant.sale_price || 0,
            discount_price: firstVariant.discount_price,
            discount_type: firstVariant.discount_type || "flat",
          });
        }

        // Check if all variants have the same prices - if not, disable unified pricing
        const allSamePrice = loadedVariants.every(
          (v) =>
            v.cost_price === firstVariant.cost_price &&
            v.sale_price === firstVariant.sale_price &&
            v.discount_type === firstVariant.discount_type &&
            hasSameDiscountInput(v.discount_price, firstVariant.discount_price),
        );
        if (!allSamePrice) {
          setUnifiedPricing(false);
        }
      }

      if (p.images && p.images.length > 0) {
        setImages(
          p.images
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((i) => ({
              url: i.url,
              path: i.url.split("/").pop() || "", // Extract filename from URL
            })),
        );
      }
    })();
  }, [productId]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !isEditing) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const updateVariant = (
    index: number,
    field: string,
    value: string | number | boolean | null | Record<string, string>,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const addVariant = () =>
    setVariants((prev) => [...prev, { ...emptyVariant }]);
  const removeVariant = (index: number) =>
    setVariants((prev) => prev.filter((_, i) => i !== index));

  // Generate SKU from slug + size + color + unique suffix
  const generateSku = (size: string, color: string) => {
    const slugPart = form.slug
      ? form.slug.substring(0, 10).toUpperCase()
      : "PROD";
    const sizePart = size.replace(/\s+/g, "").substring(0, 4).toUpperCase();
    const colorPart = color ? color.substring(0, 3).toUpperCase() : "";
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    return `${slugPart}-${sizePart}${colorPart ? "-" + colorPart : ""}-${randomSuffix}`;
  };

  // Calculate the final discounted price based on discount type and value
  const calculateFinalPrice = (
    salePrice: number,
    discountValue: number | null,
    discountType: "flat" | "percentage",
  ): number | null => {
    if (discountValue === null || discountValue <= 0 || salePrice <= 0) {
      return null;
    }

    if (discountType === "percentage") {
      const boundedPercent = Math.min(Math.max(discountValue, 0), 100);
      const finalPrice = roundCurrency(
        salePrice - (salePrice * boundedPercent) / 100,
      );
      return finalPrice < salePrice ? Math.max(finalPrice, 0) : null;
    }

    const finalPrice = roundCurrency(salePrice - discountValue);
    return finalPrice < salePrice ? Math.max(finalPrice, 0) : null;
  };

  // Apply shared prices to all variants before submit
  const getVariantsForSubmit = () => {
    return variants.map((v) => {
      const salePrice = unifiedPricing ? sharedPrices.sale_price : v.sale_price;
      const discountValue = unifiedPricing
        ? sharedPrices.discount_price
        : v.discount_price;
      const discountType = unifiedPricing
        ? sharedPrices.discount_type
        : v.discount_type;

      // Only generate new SKU for new variants (no id) when autoSku is enabled
      // Keep existing SKU for variants that already have an id
      let sku = v.sku;
      if (autoSku && !v.id) {
        sku = generateSku(v.size, v.color);
      }

      return {
        ...v,
        cost_price: unifiedPricing ? sharedPrices.cost_price : v.cost_price,
        sale_price: salePrice,
        discount_price: calculateFinalPrice(
          salePrice,
          discountValue,
          discountType,
        ),
        discount_type: discountType,
        sku,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    if (variants.length === 0) {
      toast.error("Add at least one variant");
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        category_id: form.category_id || null,
        team: form.team || null,
        league: form.league || null,
        season: form.season || null,
        brand: form.brand || null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        is_featured: form.is_featured,
        is_active: form.is_active,
      };

      let pId = productId;

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "A product with this slug already exists. Please use a different name or slug.",
            );
          }
          throw error;
        }
        pId = data.id;
      }

      // Handle variants
      const finalVariants = getVariantsForSubmit();
      if (isEditing) {
        // Delete removed variants (only if there are existing IDs to keep)
        const existingIds = finalVariants.filter((v) => v.id).map((v) => v.id!);
        if (existingIds.length > 0) {
          await supabase
            .from("product_variants")
            .delete()
            .eq("product_id", pId!)
            .not("id", "in", `(${existingIds.join(",")})`);
        } else {
          // No existing variants to keep, delete all old variants
          await supabase
            .from("product_variants")
            .delete()
            .eq("product_id", pId!);
        }

        // Upsert variants
        for (const v of finalVariants) {
          const variantData = {
            product_id: pId!,
            size: v.size,
            color: v.color || null,
            sku: v.sku || null,
            cost_price: v.cost_price,
            sale_price: v.sale_price,
            discount_price: v.discount_price ?? null,
            discount_type: v.discount_type,
            stock_quantity: v.stock_quantity,
            is_active: v.is_active,
            attributes: v.attributes || {},
          };
          if (v.id) {
            const { error } = await supabase
              .from("product_variants")
              .update(variantData)
              .eq("id", v.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("product_variants")
              .insert(variantData);
            if (error) throw error;
          }
        }
      } else {
        const variantInserts = finalVariants.map((v) => ({
          product_id: pId!,
          size: v.size,
          color: v.color || null,
          sku: v.sku || null,
          cost_price: v.cost_price,
          sale_price: v.sale_price,
          discount_price: v.discount_price ?? null,
          discount_type: v.discount_type,
          stock_quantity: v.stock_quantity,
          is_active: v.is_active,
          attributes: v.attributes || {},
        }));
        const { error } = await supabase
          .from("product_variants")
          .insert(variantInserts);
        if (error) throw error;
      }

      // Handle images
      if (isEditing) {
        await supabase.from("product_images").delete().eq("product_id", pId!);
      }
      if (images.length > 0) {
        const imageInserts = images.map((image, i) => ({
          product_id: pId!,
          url: image.url,
          alt_text: form.name,
          sort_order: i,
          is_primary: i === 0,
        }));
        await supabase.from("product_images").insert(imageInserts);
      }

      toast.success(isEditing ? "Product updated!" : "Product created!");
      router.push("/admin/products");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  };

  const categorySelectOptions = useMemo(() => {
    const sortedCategories = [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    const options: Array<{
      id: string;
      name: string;
      level: number;
      is_active: boolean;
    }> = [];
    const visited = new Set<string>();

    const appendCategory = (category: Category, level: number) => {
      if (visited.has(category.id)) return;
      visited.add(category.id);

      options.push({
        id: category.id,
        name: category.name,
        level,
        is_active: category.is_active,
      });

      sortedCategories
        .filter((child) => child.parent_id === category.id)
        .forEach((child) => appendCategory(child, level + 1));
    };

    sortedCategories
      .filter((category) => !category.parent_id)
      .forEach((rootCategory) => appendCategory(rootCategory, 0));

    sortedCategories
      .filter((category) => !visited.has(category.id))
      .forEach((orphanCategory) => appendCategory(orphanCategory, 0));

    return options;
  }, [categories]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Product" : "New Product"}
          </h1>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Barcelona Home Jersey 2025"
                    required
                  />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    placeholder="barcelona-home-jersey-2025"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  placeholder="Product description..."
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Team</Label>
                  <Input
                    value={form.team}
                    onChange={(e) => handleChange("team", e.target.value)}
                    placeholder="FC Barcelona"
                  />
                </div>
                <div>
                  <Label>League</Label>
                  <Input
                    value={form.league}
                    onChange={(e) => handleChange("league", e.target.value)}
                    placeholder="La Liga"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Season</Label>
                  <Input
                    value={form.season}
                    onChange={(e) => handleChange("season", e.target.value)}
                    placeholder="2025/26"
                  />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="Nike"
                  />
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="football, la-liga, home-kit"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={10}
              />
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variants *</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="size-3 mr-1" /> Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unified Pricing & Auto SKU Options */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="unifiedPricing"
                      checked={unifiedPricing}
                      onChange={(e) => setUnifiedPricing(e.target.checked)}
                      className="rounded"
                    />
                    <Label
                      htmlFor="unifiedPricing"
                      className="text-sm font-medium"
                    >
                      Same price for all variants
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoSku"
                      checked={autoSku}
                      onChange={(e) => setAutoSku(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="autoSku" className="text-sm font-medium">
                      Auto-generate SKU
                    </Label>
                  </div>
                </div>

                {/* Shared pricing inputs */}
                {unifiedPricing && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Cost Price (৳)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sharedPrices.cost_price}
                        onChange={(e) =>
                          setSharedPrices((prev) => ({
                            ...prev,
                            cost_price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Sale Price (৳)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sharedPrices.sale_price}
                        onChange={(e) =>
                          setSharedPrices((prev) => ({
                            ...prev,
                            sale_price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Discount Type</Label>
                      <Select
                        value={sharedPrices.discount_type}
                        onValueChange={(value: "flat" | "percentage") =>
                          setSharedPrices((prev) => ({
                            ...prev,
                            discount_type: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat (৳)</SelectItem>
                          <SelectItem value="percentage">
                            Percentage (%)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">
                        Discount{" "}
                        {sharedPrices.discount_type === "percentage"
                          ? "(%)"
                          : "(৳)"}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={
                          sharedPrices.discount_type === "percentage"
                            ? 100
                            : undefined
                        }
                        value={sharedPrices.discount_price ?? ""}
                        onChange={(e) =>
                          setSharedPrices((prev) => ({
                            ...prev,
                            discount_price: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {variants.map((v, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-medium">Variant {i + 1}</p>
                    {variants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(i)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label>{variantOptions.size_label}</Label>
                      <Select
                        value={v.size}
                        onValueChange={(val) => updateVariant(i, "size", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {variantOptions.sizes.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{variantOptions.color_label}</Label>
                      <Select
                        value={v.color}
                        onValueChange={(val) => updateVariant(i, "color", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {variantOptions.colors.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Custom Variant Types */}
                    {variantOptions.customTypes.map((customType) => (
                      <div key={customType.key}>
                        <Label>
                          {customType.name}
                          {customType.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Select
                          value={v.attributes[customType.key] || ""}
                          onValueChange={(val) => {
                            const newAttributes = {
                              ...v.attributes,
                              [customType.key]: val,
                            };
                            updateVariant(i, "attributes", newAttributes);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {customType.values.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {!autoSku && (
                      <div>
                        <Label>SKU</Label>
                        <Input
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(i, "sku", e.target.value)
                          }
                          placeholder="BCN-H-M"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        min={0}
                        value={v.stock_quantity}
                        onChange={(e) =>
                          updateVariant(
                            i,
                            "stock_quantity",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    {!unifiedPricing && (
                      <>
                        <div>
                          <Label>Cost Price (৳)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={v.cost_price}
                            onChange={(e) =>
                              updateVariant(
                                i,
                                "cost_price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Sale Price (৳)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={v.sale_price}
                            onChange={(e) =>
                              updateVariant(
                                i,
                                "sale_price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Discount Type</Label>
                          <Select
                            value={v.discount_type}
                            onValueChange={(value: "flat" | "percentage") =>
                              updateVariant(i, "discount_type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">Flat (৳)</SelectItem>
                              <SelectItem value="percentage">
                                Percentage (%)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>
                            Discount{" "}
                            {v.discount_type === "percentage" ? "(%)" : "(৳)"}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={
                              v.discount_type === "percentage" ? 100 : undefined
                            }
                            value={v.discount_price ?? ""}
                            onChange={(e) =>
                              updateVariant(
                                i,
                                "discount_price",
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              )
                            }
                            placeholder="Optional"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(val) => handleChange("category_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.category_id &&
                      !categorySelectOptions.some(
                        (category) => category.id === form.category_id,
                      ) && (
                        <SelectItem value={form.category_id}>
                          Current category (Unavailable)
                        </SelectItem>
                      )}
                    {categorySelectOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {`${"— ".repeat(category.level)}${category.name}${category.is_active ? "" : " (Inactive)"}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.category_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Variant options: {variantOptions.sizes.length} sizes,{" "}
                    {variantOptions.colors.length} colors
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={form.is_featured}
                  onChange={(e) =>
                    handleChange("is_featured", e.target.checked)
                  }
                  className="rounded"
                />
                <Label htmlFor="is_featured">Featured product</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active (visible to customers)</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
