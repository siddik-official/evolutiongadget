"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.find((img) => img.is_primary);
  const firstImage = product.images?.[0];
  const imageUrl =
    primaryImage?.url || firstImage?.url || "/placeholder-jersey.svg";

  // Get price range from variants
  const variants = product.variants || [];
  const displayVariant = variants.reduce<(typeof variants)[number] | null>(
    (lowest, variant) => {
      const variantPrice = variant.discount_price ?? variant.sale_price;
      if (!lowest) return variant;

      const lowestPrice = lowest.discount_price ?? lowest.sale_price;
      return variantPrice < lowestPrice ? variant : lowest;
    },
    null,
  );
  const currentPrice = displayVariant
    ? (displayVariant.discount_price ?? displayVariant.sale_price)
    : 0;
  const originalPrice = displayVariant?.sale_price ?? 0;
  const hasDiscount = Boolean(
    displayVariant &&
      displayVariant.discount_price !== null &&
      displayVariant.discount_price < displayVariant.sale_price,
  );
  const discountAmount = hasDiscount
    ? Math.max(originalPrice - currentPrice, 0)
    : 0;
  const discountBadge = hasDiscount && displayVariant
    ? displayVariant.discount_type === "flat"
      ? `-৳${Number.isInteger(discountAmount) ? discountAmount : discountAmount.toFixed(2)}`
      : `-${Math.round((discountAmount / originalPrice) * 100)}%`
    : null;
  const inStock = variants.some((v) => v.stock_quantity > 0);

  return (
    <div className="group bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && (
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {discountBadge}
              </Badge>
            )}
            {!inStock && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                Out of Stock
              </Badge>
            )}
          </div>
          {product.team && (
            <div className="absolute bottom-2 left-2">
              <Badge
                variant="secondary"
                className="text-[10px] bg-card/90 text-foreground"
              >
                {product.team}
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          {product.category && (
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
              {product.category.name}
            </p>
          )}
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-primary">
              {formatPrice(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* CTA */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <Button
          className="w-full gap-2"
          size="sm"
          disabled={!inStock}
          asChild={inStock}
        >
          {inStock ? (
            <Link href={`/product/${product.slug}`}>
              <ShoppingCart className="size-4" />
              Order Now
            </Link>
          ) : (
            <span>Out of Stock</span>
          )}
        </Button>
      </div>
    </div>
  );
}
