"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { trackAddToCart, trackViewContent } from "@/lib/analytics";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types";

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const images = useMemo(() => product.images || [], [product.images]);
  const variants = useMemo(() => product.variants || [], [product.variants]);
  const defaultVariant = useMemo(() => {
    const activeVariants = variants.filter((variant) => variant.is_active);
    const candidates = activeVariants.length > 0 ? activeVariants : variants;

    if (candidates.length === 0) {
      return null;
    }

    const [firstCandidate, ...otherCandidates] = candidates;

    return otherCandidates.reduce((best, variant) => {
      const bestPrice = best.discount_price ?? best.sale_price;
      const variantPrice = variant.discount_price ?? variant.sale_price;

      if (variantPrice < bestPrice) return variant;
      if (variantPrice === bestPrice) {
        if (best.stock_quantity <= 0 && variant.stock_quantity > 0) {
          return variant;
        }
      }

      return best;
    }, firstCandidate);
  }, [variants]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    defaultVariant,
  );
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  // Track view content on mount
  useEffect(() => {
    trackViewContent({
      content_name: product.name,
      content_ids: [product.id],
      content_type: "product",
      value: selectedVariant?.sale_price || 0,
      currency: "BDT",
    });
  }, [product.id, product.name, selectedVariant?.sale_price]);

  const currentPrice = selectedVariant
    ? (selectedVariant.discount_price ?? selectedVariant.sale_price)
    : 0;
  const originalPrice = selectedVariant?.sale_price || 0;
  const hasDiscount = Boolean(
    selectedVariant &&
      selectedVariant.discount_price !== null &&
      selectedVariant.discount_price < selectedVariant.sale_price,
  );
  const discountAmount = hasDiscount
    ? Math.max(originalPrice - currentPrice, 0)
    : 0;
  const discountBadge = hasDiscount && selectedVariant
    ? selectedVariant.discount_type === "flat"
      ? `-৳${Number.isInteger(discountAmount) ? discountAmount : discountAmount.toFixed(2)}`
      : `-${Math.round((discountAmount / originalPrice) * 100)}% OFF`
    : null;
  const inStock = selectedVariant ? selectedVariant.stock_quantity > 0 : false;
  const stockCount = selectedVariant?.stock_quantity || 0;

  const handleAddToCart = () => {
    if (!selectedVariant || !inStock) return;

    addItem(product, selectedVariant, quantity);
    toast.success(`${product.name} added to cart!`);

    trackAddToCart({
      content_name: product.name,
      content_ids: [product.id],
      content_type: "product",
      value: currentPrice * quantity,
      currency: "BDT",
    });
  };

  const uniqueSizes = useMemo(
    () => [...new Set(variants.map((v) => v.size))],
    [variants],
  );

  const customVariantTypes = useMemo(() => {
    const variantTypes: { key: string; values: string[] }[] = [];
    const seenKeys = new Set<string>();

    variants.forEach((variant) => {
      if (!variant.attributes) return;
      Object.keys(variant.attributes).forEach((key) => {
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        const values = [
          ...new Set(
            variants
              .filter((item) => item.attributes?.[key])
              .map((item) => item.attributes![key]),
          ),
        ];
        variantTypes.push({ key, values });
      });
    });

    return variantTypes;
  }, [variants]);

  // Track selected custom attributes
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >(() => {
    // Initialize with the default variant's attributes
    if (defaultVariant?.attributes) {
      return { ...defaultVariant.attributes };
    }
    return {};
  });

  // Find matching variant based on size and custom attributes
  const findMatchingVariant = (
    size: string,
    attributes: Record<string, string>,
  ) => {
    return variants.find((v) => {
      if (v.size !== size) return false;

      // Check if all selected attributes match
      for (const [key, value] of Object.entries(attributes)) {
        if (v.attributes?.[key] !== value) return false;
      }

      return true;
    });
  };

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    const variant = findMatchingVariant(size, selectedAttributes);
    if (variant) {
      setSelectedVariant(variant);
      setQuantity(1);
    } else {
      // If no exact match, find any variant with this size
      const anyWithSize = variants.find((v) => v.size === size && v.is_active);
      if (anyWithSize) {
        setSelectedVariant(anyWithSize);
        // Update selected attributes to match this variant
        if (anyWithSize.attributes) {
          setSelectedAttributes({ ...anyWithSize.attributes });
        }
        setQuantity(1);
      }
    }
  };

  // Handle custom attribute selection
  const handleAttributeSelect = (key: string, value: string) => {
    const newAttributes = { ...selectedAttributes, [key]: value };
    setSelectedAttributes(newAttributes);

    // Find variant matching current size and new attributes
    const variant = findMatchingVariant(
      selectedVariant?.size || uniqueSizes[0],
      newAttributes,
    );
    if (variant) {
      setSelectedVariant(variant);
      setQuantity(1);
    }
  };

  // Check if a specific attribute value is available (has stock)
  const isAttributeAvailable = (key: string, value: string) => {
    return variants.some(
      (v) =>
        v.attributes?.[key] === value && v.is_active && v.stock_quantity > 0,
    );
  };

  // Check if a size is available with current attributes
  const isSizeAvailable = (size: string) => {
    if (customVariantTypes.length === 0) {
      const variant = variants.find((v) => v.size === size && v.is_active);
      return variant && variant.stock_quantity > 0;
    }

    const variant = findMatchingVariant(size, selectedAttributes);
    return variant && variant.is_active && variant.stock_quantity > 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Image Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
          {images.length > 0 ? (
            <Image
              src={images[selectedImage]?.url || ""}
              alt={images[selectedImage]?.alt_text || product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image Available
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              {discountBadge}
            </Badge>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(idx)}
                className={`relative size-16 sm:size-20 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                  selectedImage === idx
                    ? "border-primary"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt_text || ""}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        {product.category && (
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            {product.category.name}
            {product.team && ` · ${product.team}`}
          </p>
        )}

        <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-primary">
            {formatPrice(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Stock status */}
        <div className="flex items-center gap-2">
          {inStock ? (
            <>
              <Check className="size-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                In Stock
                {stockCount <= 5 && ` (Only ${stockCount} left)`}
              </span>
            </>
          ) : (
            <span className="text-sm text-destructive font-medium">
              Out of Stock
            </span>
          )}
        </div>

        {/* Custom Variant Types (e.g., Sleeves, Edition) */}
        {customVariantTypes.map((variantType) => (
          <div key={variantType.key}>
            <Label className="text-sm font-medium mb-2 block capitalize">
              {variantType.key.replace(/_/g, " ")}:{" "}
              {selectedAttributes[variantType.key] || "—"}
            </Label>
            <div className="flex flex-wrap gap-2">
              {variantType.values.map((value) => {
                const isSelected =
                  selectedAttributes[variantType.key] === value;
                const isAvailable = isAttributeAvailable(
                  variantType.key,
                  value,
                );

                return (
                  <button
                    key={value}
                    onClick={() =>
                      handleAttributeSelect(variantType.key, value)
                    }
                    disabled={!isAvailable}
                    className={`px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isAvailable
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40 line-through cursor-not-allowed"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Size Selection */}
        {uniqueSizes.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Size: {selectedVariant?.size}
            </Label>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => {
                const isSelected = selectedVariant?.size === size;
                const isAvailable = isSizeAvailable(size);

                return (
                  <button
                    key={size}
                    onClick={() => handleSizeSelect(size)}
                    disabled={!isAvailable}
                    className={`px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isAvailable
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40 line-through cursor-not-allowed"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <span className="text-lg font-semibold w-8 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
              disabled={quantity >= stockCount}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1 gap-2 text-base"
            disabled={!inStock || !selectedVariant}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="size-5" />
            Add to Cart
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1 text-base"
            disabled={!inStock || !selectedVariant}
            onClick={() => {
              handleAddToCart();
              window.location.href = "/checkout";
            }}
          >
            Order Now
          </Button>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4" />
            Cash on Delivery
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            Authentic Quality
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}
