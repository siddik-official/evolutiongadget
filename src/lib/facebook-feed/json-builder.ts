// ─── Facebook Feed JSON Builder ───
// Outputs the same product feed data as a JSON array for Meta's JSON feed option.

import type { ProductFeedItem } from "./types";

/**
 * Builds a JSON feed object from an array of ProductFeedItems.
 * Meta Commerce Manager accepts JSON feeds as an alternative to XML.
 */
export function buildProductFeedJson(items: ProductFeedItem[]): object {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    availability: item.availability,
    condition: item.condition,
    price: item.price,
    link: item.link,
    image_link: item.image_link,
    brand: item.brand,
    ...(item.sale_price && { sale_price: item.sale_price }),
    ...(item.additional_image_link &&
      item.additional_image_link.length > 0 && {
        additional_image_link: item.additional_image_link,
      }),
    ...(item.item_group_id && { item_group_id: item.item_group_id }),
    ...(item.size && { size: item.size }),
    ...(item.color && { color: item.color }),
    ...(item.mpn && { mpn: item.mpn }),
    ...(item.gtin && { gtin: item.gtin }),
    ...(item.google_product_category && {
      google_product_category: item.google_product_category,
    }),
    ...(item.product_type && { product_type: item.product_type }),
    ...(item.custom_label_0 && { custom_label_0: item.custom_label_0}),
  }));
}
