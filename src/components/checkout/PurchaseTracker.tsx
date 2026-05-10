"use client";

import { useEffect, useState } from "react";
import { trackPurchase, AnalyticsItem } from "@/lib/analytics";

interface PurchaseTrackerProps {
  order: {
    order_number: string;
    total: number;
    subtotal: number;
    delivery_charge: number;
    discount_amount?: number;
    items?: {
      product_id: string;
      product_name: string;
      variant_size: string;
      total_price: number;
      quantity: number;
    }[];
  };
}

export function PurchaseTracker({ order }: PurchaseTrackerProps) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (tracked) return;
    
    const storageKey = `tracked_order_${order.order_number}`;
    if (sessionStorage.getItem(storageKey)) {
      setTracked(true);
      return;
    }

    const items: AnalyticsItem[] = (order.items || []).map((item) => ({
      item_id: item.product_id,
      item_name: item.product_name,
      price: Number(Number(item.total_price / item.quantity).toFixed(2)),
      quantity: item.quantity,
      item_variant: item.variant_size,
    }));

    const contentIds = (order.items || []).map((item) => item.product_id);
    const numItems = (order.items || []).reduce((acc, item) => acc + item.quantity, 0);

    trackPurchase({
      content_ids: contentIds,
      value: order.total,
      currency: "BDT",
      num_items: numItems,
      order_id: order.order_number,
      shipping: order.delivery_charge,
      tax: 0,
      items: items,
    });

    sessionStorage.setItem(storageKey, "true");
    setTracked(true);
  }, [order, tracked]);

  return null;
}
