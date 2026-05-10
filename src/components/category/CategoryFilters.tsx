"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_SIZES, JERSEY_COLORS } from "@/lib/constants";
import { SlidersHorizontal, X } from "lucide-react";

interface CategoryFiltersProps {
  slug: string;
}

export function CategoryFilters({ slug }: CategoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get("sizes")?.split(",").filter(Boolean) || [],
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get("colors")?.split(",").filter(Boolean) || [],
  );
  const [team, setTeam] = useState(searchParams.get("team") || "");

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (selectedSizes.length) params.set("sizes", selectedSizes.join(","));
    if (selectedColors.length) params.set("colors", selectedColors.join(","));
    if (team) params.set("team", team);

    router.push(`/category/${slug}?${params.toString()}`);
  };

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setTeam("");
    router.push(`/category/${slug}`);
  };

  const hasFilters =
    minPrice ||
    maxPrice ||
    selectedSizes.length ||
    selectedColors.length ||
    team;

  return (
    <div>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        className="w-full lg:hidden mb-4 gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <SlidersHorizontal className="size-4" />
        Filters
        {hasFilters && (
          <Badge className="ml-auto size-5 flex items-center justify-center p-0 text-[10px]">
            !
          </Badge>
        )}
      </Button>

      <div
        className={`space-y-6 ${isOpen ? "block" : "hidden"} lg:block bg-card p-4 rounded-xl border`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filters</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <X className="size-3" /> Clear all
            </button>
          )}
        </div>

        {/* Price range */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Price Range (৳)
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Size filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Size</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  selectedSizes.includes(size)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Color filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {JERSEY_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  selectedColors.includes(color)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Team search */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Team / Club</Label>
          <Input
            type="text"
            placeholder="e.g. Barcelona, Argentina"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <Button onClick={applyFilters} className="w-full" size="sm">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
