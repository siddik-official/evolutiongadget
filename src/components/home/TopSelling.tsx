"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";


interface TopSellingScrollProps {
  products: Product[];
}

function ProductScrollCard({ product }: { product: Product }) {
  const primaryImage = product.images?.find((img) => img.is_primary);
  const firstImage = product.images?.[0];
  const imageUrl =
    primaryImage?.url || firstImage?.url || "/placeholder-jersey.svg";

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
  const discountAmount = hasDiscount ? Math.max(originalPrice - currentPrice, 0) : 0;
  const discountBadge = hasDiscount && displayVariant
    ? displayVariant.discount_type === "flat"
      ? `-৳${Number.isInteger(discountAmount) ? discountAmount : discountAmount.toFixed(2)}`
      : `-${Math.round((discountAmount / originalPrice) * 100)}%`
    : null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group shrink-0 w-[200px] sm:w-[230px] bg-card rounded-2xl border border-border/40 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          sizes="230px"
        />
        {hasDiscount && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {discountBadge}
            </span>
          </div>
        )}
        {product.team && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-[10px] bg-card/90 text-foreground">
              {product.team}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {product.category && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            {product.category.name}
          </p>
        )}
        <h3 className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors min-h-[2rem]">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-sm font-bold text-primary">
            {formatPrice(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TopSellingScroll({ products }: TopSellingScrollProps) {
  if (products.length === 0) return null;

  // Duplicate for seamless infinite loop
  const doubled = [...products, ...products];

  return (
    <div className="overflow-hidden">
      <div className="flex gap-4 top-selling-track">
        {doubled.map((product, i) => (
          <ProductScrollCard key={`${product.id}-${i}`} product={product} />
        ))}
      </div>
    </div>
  );
}
