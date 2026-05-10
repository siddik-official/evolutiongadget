// ─── Facebook Feed XML Builder ───
// Generates RSS 2.0 XML with Google Merchant Center namespace for Meta Commerce Manager.

import type { ProductFeedItem, FeedConfig } from "./types";
import { escapeXml } from "./utils";

/**
 * Builds a complete RSS 2.0 XML feed from an array of ProductFeedItems.
 * Uses programmatic XML building (not templates) to ensure proper escaping.
 */
export function buildProductFeedXml(
  items: ProductFeedItem[],
  config: FeedConfig,
): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
  );
  lines.push("  <channel>");
  lines.push(`    <title>${escapeXml(config.shopName)}</title>`);
  lines.push(`    <link>${escapeXml(config.siteUrl)}</link>`);
  lines.push(
    `    <description>${escapeXml(config.shopDescription)}</description>`,
  );

  for (const item of items) {
    lines.push("    <item>");
    lines.push(`      <g:id>${escapeXml(item.id)}</g:id>`);
    lines.push(`      <g:title>${escapeXml(item.title)}</g:title>`);
    lines.push(
      `      <g:description>${escapeXml(item.description)}</g:description>`,
    );
    lines.push(`      <g:link>${escapeXml(item.link)}</g:link>`);
    lines.push(
      `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>`,
    );

    // Additional images (up to 10)
    if (item.additional_image_link) {
      for (const imgUrl of item.additional_image_link.slice(0, 10)) {
        lines.push(
          `      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`,
        );
      }
    }

    lines.push(`      <g:availability>${item.availability}</g:availability>`);
    lines.push(`      <g:price>${escapeXml(item.price)}</g:price>`);

    if (item.sale_price) {
      lines.push(
        `      <g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>`,
      );
    }

    lines.push(`      <g:brand>${escapeXml(item.brand)}</g:brand>`);
    lines.push(`      <g:condition>${item.condition}</g:condition>`);

    if (item.item_group_id) {
      lines.push(
        `      <g:item_group_id>${escapeXml(item.item_group_id)}</g:item_group_id>`,
      );
    }

    if (item.size) {
      lines.push(`      <g:size>${escapeXml(item.size)}</g:size>`);
    }

    if (item.color) {
      lines.push(`      <g:color>${escapeXml(item.color)}</g:color>`);
    }

    if (item.mpn) {
      lines.push(`      <g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
    }

    if (item.gtin) {
      lines.push(`      <g:gtin>${escapeXml(item.gtin)}</g:gtin>`);
    }

    if (item.google_product_category) {
      lines.push(
        `      <g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>`,
      );
    }

    if (item.product_type) {
      lines.push(
        `      <g:product_type>${escapeXml(item.product_type)}</g:product_type>`,
      );
    }

    if (item.custom_label_0) {
      lines.push(
        `      <g:custom_label_0>${escapeXml(item.custom_label_0)}</g:custom_label_0>`,
      );
    }

    lines.push("    </item>");
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  return lines.join("\n");
}
