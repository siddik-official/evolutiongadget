// ─── Facebook Pixel & Google Tag Manager Analytics ───

// Extend Window interface for TypeScript
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

export function trackViewContent(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value: number;
  currency: string;
}) {
  const value = Number(Number(params.value).toFixed(2));
  // Facebook Pixel
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "ViewContent", { ...params, value });
  }
  // GTM dataLayer
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: "view_item",
      ecommerce: {
        currency: params.currency,
        value: value,
        items: params.content_ids.map((id) => ({
          item_id: id,
          item_name: params.content_name,
        })),
      },
    });
  }
  console.debug("[Analytics] ViewContent", { ...params, value });
}

export function trackAddToCart(params: {
  content_name: string;
  content_ids: string[];
  content_type: string;
  value: number;
  currency: string;
}) {
  const value = Number(Number(params.value).toFixed(2));
  // Facebook Pixel
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "AddToCart", { ...params, value });
  }
  // GTM dataLayer
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: "add_to_cart",
      ecommerce: {
        currency: params.currency,
        value: value,
        items: params.content_ids.map((id) => ({
          item_id: id,
          item_name: params.content_name,
        })),
      },
    });
  }
  console.debug("[Analytics] AddToCart", { ...params, value });
}

export function trackInitiateCheckout(params: {
  content_ids: string[];
  value: number;
  currency: string;
  num_items: number;
}) {
  const value = Number(Number(params.value).toFixed(2));
  // Facebook Pixel
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", { ...params, value });
  }
  // GTM dataLayer
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: "begin_checkout",
      ecommerce: {
        currency: params.currency,
        value: value,
        items: params.content_ids.map((id) => ({
          item_id: id,
          quantity: 1,
        })),
      },
    });
  }
  console.debug("[Analytics] InitiateCheckout", { ...params, value });
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
}

export function trackPurchase(params: {
  content_ids: string[];
  value: number;
  currency: string;
  num_items: number;
  order_id: string;
  shipping?: number;
  tax?: number;
  items?: AnalyticsItem[];
}) {
  // Ensure strict numeric normalization
  const value = Number(Number(params.value).toFixed(2));
  const shipping = params.shipping ? Number(Number(params.shipping).toFixed(2)) : 0;
  const tax = params.tax ? Number(Number(params.tax).toFixed(2)) : 0;
  const currency = params.currency || "BDT";

  // Facebook Pixel - Flat payload
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase", {
      content_ids: params.content_ids,
      value: value,
      currency: currency,
      num_items: params.num_items,
      order_id: params.order_id,
    });
  }
  // GTM dataLayer - Nested ecommerce payload
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: params.order_id,
        value: value,
        tax: tax,
        shipping: shipping,
        currency: currency,
        items: params.items || params.content_ids.map((id) => ({
          item_id: id,
          quantity: 1,
        })),
      },
    });
  }
  console.debug("[Analytics] Purchase", { ...params, value, shipping, tax });
}

// ─── Google Analytics / GTM Event Helper ───
export function gtagEvent(action: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: action,
      ...params,
    });
  }
  console.debug("[GA]", action, params);
}
