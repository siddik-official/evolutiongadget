"use client";

import React, { Suspense, ReactNode } from "react";
import {
  CheckoutSkeleton,
  PageSkeleton,
  ProductDetailSkeleton,
  ProductGridSkeleton,
} from "./skeleton-loaders";

interface PageTransitionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Wraps page content with smooth loading transitions
 * Use this component to wrap your page content to show skeleton loader during Suspense
 */
export function PageTransition({
  children,
  fallback = <PageSkeleton />,
  className = "",
}: PageTransitionProps) {
  return (
    <div className={`animate-in fade-in-50 duration-500 ${className}`}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </div>
  );
}

/**
 * Specialized wrapper for product grids
 */
export function ProductGridTransition({
  children,
  skeletonCount = 12,
}: {
  children: ReactNode;
  skeletonCount?: number;
}) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <Suspense fallback={<ProductGridSkeleton count={skeletonCount} />}>
        {children}
      </Suspense>
    </div>
  );
}

/**
 * Specialized wrapper for product details
 */
export function ProductDetailTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <Suspense fallback={<ProductDetailSkeleton />}>{children}</Suspense>
    </div>
  );
}

/**
 * Specialized wrapper for checkout
 */
export function CheckoutTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <Suspense fallback={<CheckoutSkeleton />}>{children}</Suspense>
    </div>
  );
}
