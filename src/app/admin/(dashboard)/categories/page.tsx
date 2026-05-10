"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
  Save,
  X,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import type { Category, VariantOptions, VariantType } from "@/types";
import CategoryImageUpload, {
  CategoryImage,
} from "@/components/admin/CategoryImageUpload";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_header: boolean;
  variant_options: VariantOptions;
}

const emptyForm: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  image_url: null,
  parent_id: null,
  sort_order: 0,
  is_active: true,
  show_in_header: false,
  variant_options: {
    variant_types: [],
  },
};

// Helper to convert legacy format to new variant_types format
const convertToVariantTypes = (opts: VariantOptions): VariantType[] => {
  // If already using new format, return as is
  if (opts.variant_types && opts.variant_types.length > 0) {
    return opts.variant_types;
  }

  // Convert legacy sizes/colors to variant_types
  const types: VariantType[] = [];

  if (opts.sizes && opts.sizes.length > 0) {
    types.push({
      name: opts.size_label || "Size",
      key: "size",
      values: opts.sizes,
      required: true,
    });
  }

  if (opts.colors && opts.colors.length > 0) {
    types.push({
      name: opts.color_label || "Color",
      key: "color",
      values: opts.colors,
      required: false,
    });
  }

  return types;
};

// Helper to convert variant_types back to legacy format (for backward compatibility)
const convertToLegacyFormat = (types: VariantType[]): VariantOptions => {
  const sizeType = types.find((t) => t.key === "size");
  const colorType = types.find((t) => t.key === "color");

  return {
    variant_types: types,
    // Keep legacy fields for backward compatibility
    sizes: sizeType?.values || [],
    colors: colorType?.values || [],
    size_label: sizeType?.name || "Size",
    color_label: colorType?.name || "Color",
  };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [categoryImage, setCategoryImage] = useState<CategoryImage | null>(null);
  const [newVariantValue, setNewVariantValue] = useState<{
    [key: string]: string;
  }>({});
  const [newVariantType, setNewVariantType] = useState({ name: "", key: "" });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories?all=true");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Build hierarchical display
  const buildHierarchy = () => {
    const rootCategories = categories.filter((c) => !c.parent_id);
    const result: { category: Category; level: number }[] = [];

    const addWithChildren = (cat: Category, level: number) => {
      result.push({ category: cat, level });
      const children = categories.filter((c) => c.parent_id === cat.id);
      children
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((child) => addWithChildren(child, level + 1));
    };

    rootCategories
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((cat) => addWithChildren(cat, 0));

    return result;
  };

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCategoryImage(null);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingId(cat.id);
    const variantTypes = convertToVariantTypes(cat.variant_options || {});
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image_url: cat.image_url || null,
      parent_id: cat.parent_id,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      show_in_header: cat.show_in_header || false,
      variant_options: {
        variant_types: variantTypes,
      },
    });
    // Set category image if exists
    if (cat.image_url) {
      // Extract path from URL (assumes URL format: https://.../storage/v1/object/public/category-images/{path})
      const urlParts = cat.image_url.split("/category-images/");
      const path = urlParts.length > 1 ? urlParts[1] : "";
      setCategoryImage({
        url: cat.image_url,
        path: path,
      });
    } else {
      setCategoryImage(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Validate max 4 categories in header (only for root categories)
    if (form.show_in_header && !form.parent_id) {
      const currentHeaderCount = categories.filter(
        (c) => c.show_in_header && !c.parent_id && c.id !== editingId,
      ).length;
      if (currentHeaderCount >= 4) {
        toast.error(
          "Maximum 4 categories can be shown in header. Please remove one first.",
        );
        return;
      }
    }

    setSaving(true);
    try {
      // Convert variant_types to include legacy format for backward compatibility
      const variantTypes = form.variant_options.variant_types || [];
      const variantOptions = convertToLegacyFormat(variantTypes);

      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        parent_id: form.parent_id === "none" ? null : form.parent_id,
        image_url: categoryImage?.url || null,
        variant_options: variantOptions,
      };

      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/categories/${editingId}`
        : "/api/categories";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success(editingId ? "Category updated!" : "Category created!");
      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // Add a new variant type
  const addVariantType = () => {
    if (!newVariantType.name.trim()) {
      toast.error("Variant type name is required");
      return;
    }

    const key = newVariantType.key.trim() || slugify(newVariantType.name);
    const existingTypes = form.variant_options.variant_types || [];

    if (existingTypes.some((t) => t.key === key)) {
      toast.error("A variant type with this key already exists");
      return;
    }

    const newType: VariantType = {
      name: newVariantType.name.trim(),
      key,
      values: [],
      required: false,
    };

    setForm((prev) => ({
      ...prev,
      variant_options: {
        ...prev.variant_options,
        variant_types: [...existingTypes, newType],
      },
    }));

    setNewVariantType({ name: "", key: "" });
    toast.success(`Added variant type: ${newType.name}`);
  };

  // Remove a variant type
  const removeVariantType = (key: string) => {
    const types = form.variant_options.variant_types || [];
    setForm((prev) => ({
      ...prev,
      variant_options: {
        ...prev.variant_options,
        variant_types: types.filter((t) => t.key !== key),
      },
    }));
  };

  // Update variant type properties
  const updateVariantType = (key: string, updates: Partial<VariantType>) => {
    const types = form.variant_options.variant_types || [];
    setForm((prev) => ({
      ...prev,
      variant_options: {
        ...prev.variant_options,
        variant_types: types.map((t) =>
          t.key === key ? { ...t, ...updates } : t,
        ),
      },
    }));
  };

  // Add a value to a variant type
  const addValueToVariantType = (key: string) => {
    const value = newVariantValue[key]?.trim();
    if (!value) return;

    const types = form.variant_options.variant_types || [];
    const variantType = types.find((t) => t.key === key);

    if (variantType?.values.includes(value)) {
      toast.error("This value already exists");
      return;
    }

    setForm((prev) => ({
      ...prev,
      variant_options: {
        ...prev.variant_options,
        variant_types: types.map((t) =>
          t.key === key ? { ...t, values: [...t.values, value] } : t,
        ),
      },
    }));

    setNewVariantValue((prev) => ({ ...prev, [key]: "" }));
  };

  // Remove a value from a variant type
  const removeValueFromVariantType = (typeKey: string, value: string) => {
    const types = form.variant_options.variant_types || [];
    setForm((prev) => ({
      ...prev,
      variant_options: {
        ...prev.variant_options,
        variant_types: types.map((t) =>
          t.key === typeKey
            ? { ...t, values: t.values.filter((v) => v !== value) }
            : t,
        ),
      },
    }));
  };

  // Get parent categories (only root categories can be parents)
  const parentOptions = categories.filter(
    (c) => !c.parent_id && c.id !== editingId,
  );

  const hierarchy = buildHierarchy();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="size-6" />
            Categories
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage product categories, subcategories, and variant options
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="size-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Configure categories with custom sizes and colors for each product
            type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2" />
              Loading categories...
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Add your first category to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Variant Options</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hierarchy.map(({ category: cat, level }) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {level > 0 && (
                          <span
                            className="text-muted-foreground"
                            style={{ marginLeft: level * 20 }}
                          >
                            <ChevronRight className="size-4 inline" />
                          </span>
                        )}
                        <span className={level > 0 ? "text-sm" : "font-medium"}>
                          {cat.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {cat.slug}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const types = convertToVariantTypes(
                          cat.variant_options || {},
                        );
                        return types.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {types.map((vt) => (
                              <Badge
                                key={vt.key}
                                variant="outline"
                                className="text-xs"
                              >
                                {vt.values.length} {vt.name.toLowerCase()}
                                {vt.values.length !== 1 ? "s" : ""}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            No variants
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={cat.is_active ? "default" : "secondary"}
                        >
                          {cat.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {cat.show_in_header && !cat.parent_id && (
                          <Badge
                            variant="outline"
                            className="text-primary border-primary"
                          >
                            Header
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(cat)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cat.id, cat.name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: prev.slug || slugify(e.target.value),
                    }));
                  }}
                  placeholder="e.g. Football Boots"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="e.g. football-boots"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>

            {/* Category Banner Image (Only for Root Categories) */}
            {!form.parent_id && (
              <div>
                <Label>Category Banner Image</Label>
                <CategoryImageUpload
                  image={categoryImage}
                  onImageChange={setCategoryImage}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Parent Category</Label>
                <Select
                  value={form.parent_id || "none"}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      parent_id: val === "none" ? null : val,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None (Root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Category)</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Checkboxes Row */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded size-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              {/* Show in Header - only for root categories */}
              {!form.parent_id && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_in_header"
                    checked={form.show_in_header}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        show_in_header: e.target.checked,
                      }))
                    }
                    className="rounded size-4"
                    disabled={
                      !form.show_in_header &&
                      categories.filter(
                        (c) =>
                          c.show_in_header &&
                          !c.parent_id &&
                          c.id !== editingId,
                      ).length >= 4
                    }
                  />
                  <Label
                    htmlFor="show_in_header"
                    className="flex items-center gap-2"
                  >
                    Show in Header
                    <span className="text-xs text-muted-foreground">
                      (
                      {
                        categories.filter(
                          (c) =>
                            c.show_in_header &&
                            !c.parent_id &&
                            c.id !== editingId,
                        ).length
                      }
                      /4)
                    </span>
                  </Label>
                </div>
              )}
            </div>

            <hr />

            {/* Variant Options */}
            <div>
              <h4 className="font-semibold mb-2">Variant Types</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Add custom variant types for this category (e.g., Size, Color,
                Material, Edition). Products in this category will use these
                variants.
              </p>

              {/* Add New Variant Type */}
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  Add New Variant Type
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={newVariantType.name}
                    onChange={(e) =>
                      setNewVariantType((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Display Name (e.g. Material)"
                    className="flex-1"
                  />
                  <Input
                    value={newVariantType.key}
                    onChange={(e) =>
                      setNewVariantType((prev) => ({
                        ...prev,
                        key: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-_]/g, ""),
                      }))
                    }
                    placeholder="Key (auto-generated)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addVariantType}
                    className="shrink-0"
                  >
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Existing Variant Types */}
              <div className="space-y-4">
                {(form.variant_options.variant_types || []).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                    <GripVertical className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No variant types configured</p>
                    <p className="text-xs">
                      Add variant types like Size, Color, or custom options
                      above
                    </p>
                  </div>
                ) : (
                  (form.variant_options.variant_types || []).map(
                    (variantType) => (
                      <div
                        key={variantType.key}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="size-4 text-muted-foreground" />
                            <div>
                              <Input
                                value={variantType.name}
                                onChange={(e) =>
                                  updateVariantType(variantType.key, {
                                    name: e.target.value,
                                  })
                                }
                                className="font-medium h-8 w-40"
                              />
                              <span className="text-xs text-muted-foreground">
                                Key: {variantType.key}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`required-${variantType.key}`}
                                checked={variantType.required}
                                onChange={(e) =>
                                  updateVariantType(variantType.key, {
                                    required: e.target.checked,
                                  })
                                }
                                className="rounded size-3"
                              />
                              <Label
                                htmlFor={`required-${variantType.key}`}
                                className="text-xs"
                              >
                                Required
                              </Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeVariantType(variantType.key)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Add Values */}
                        <div className="flex gap-2">
                          <Input
                            value={newVariantValue[variantType.key] || ""}
                            onChange={(e) =>
                              setNewVariantValue((prev) => ({
                                ...prev,
                                [variantType.key]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              addValueToVariantType(variantType.key)
                            }
                            placeholder={`Add ${variantType.name.toLowerCase()} value...`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addValueToVariantType(variantType.key)
                            }
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>

                        {/* Values List */}
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                          {variantType.values.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              No values added yet
                            </span>
                          ) : (
                            variantType.values.map((value) => (
                              <Badge
                                key={value}
                                variant="secondary"
                                className="gap-1 pr-1"
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeValueFromVariantType(
                                      variantType.key,
                                      value,
                                    )
                                  }
                                  className="hover:bg-destructive/20 rounded p-0.5"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
