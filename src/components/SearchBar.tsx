"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface SearchBarProps {
  onExpandChange?: (expanded: boolean) => void;
  triggerClassName?: string;
}

export function SearchBar({
  onExpandChange,
  triggerClassName,
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search function
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}&limit=8`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        searchProducts(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchProducts]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      onExpandChange?.(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      onExpandChange?.(false);
      setQuery("");
      setResults([]);
    }
  }, [open, onExpandChange]);

  // Handle result click
  const handleResultClick = () => {
    setOpen(false);
  };

  return (
    <Drawer direction="top" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search products"
          className={triggerClassName}
        >
          <Search className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="space-y-4 p-4 max-w-3xl mx-auto w-full">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="h-12 pl-10 pr-10 text-base"
              placeholder="Search jerseys, teams, leagues..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Search results */}
          {query.trim() && (
            <div className="max-h-[60vh] overflow-y-auto">
              {results.length === 0 && !loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="size-12 mx-auto mb-3 opacity-50" />
                  <p>No products found for &ldquo;{query}&rdquo;</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">
                    Found {results.length} product
                    {results.length !== 1 ? "s" : ""}
                  </h4>
                  <div className="space-y-1">
                    {results.map((product) => {
                      const primaryImage = product.images?.find(
                        (img) => img.is_primary,
                      );
                      const image = primaryImage || product.images?.[0];
                      const firstVariant = product.variants?.[0];
                      const price =
                        firstVariant?.discount_price ??
                        firstVariant?.sale_price;

                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          {image && (
                            <img
                              src={image.url}
                              alt={product.name}
                              className="size-16 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {product.name}
                            </p>
                            {product.team && (
                              <p className="text-xs text-muted-foreground">
                                {product.team}
                                {product.league && ` • ${product.league}`}
                              </p>
                            )}
                            {price && (
                              <p className="text-sm font-semibold text-primary mt-1">
                                {formatPrice(price)}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  {results.length === 8 && (
                    <div className="py-2 text-xs text-center text-muted-foreground border-t mt-2">
                      Showing first 8 results. Try a more specific search.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Initial state - no query */}
          {!query.trim() && (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-sm">Start typing to search products...</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
