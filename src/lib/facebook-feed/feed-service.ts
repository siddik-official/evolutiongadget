// ─── Facebook Feed Service (Orchestrator) ───
// Coordinates: fetch products → map to ProductFeedItem[] → serialize to XML/JSON.

import type { FeedConfig, FeedProduct, ProductFeedItem } from "./types";
import { getCatalogFeedProducts } from "./data-source";
import { buildProductFeedXml } from "./xml-builder";
import { buildProductFeedJson } from "./json-builder";
import {
  buildAbsoluteUrl,
  formatFeedPrice,
  stripHtml,
  truncate,
} from "./utils";

/**
 * Default feed configuration for Evolution Gadget.
 */
function getDefaultConfig(): FeedConfig {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    siteUrl,
    shopName: "Evolution Gadget Product Feed",
    shopDescription:
      "A trusted destination for cutting-edge accessories and mobile marvels from Evolution Gadget.",
    defaultBrand: "Evolution Gadget",
    defaultCurrency: "BDT",
    defaultCondition: "new",
  };
}

/**
 * Maps a single product + variant combination to a ProductFeedItem.
 */
function mapVariantToFeedItem(
  product: FeedProduct,
  variant: FeedProduct["variants"][number],
  config: FeedConfig,
): ProductFeedItem {
  // Build composite ID: {product_uuid}__{variant_uuid}
  const id = `${product.id}__${variant.id}`;

  // Build variant title suffix from size, color, and custom attributes
  const titleParts: string[] = [];
  if (variant.size) titleParts.push(variant.size);
  if (variant.color) titleParts.push(variant.color);
  if (variant.attributes) {
    for (const [, value] of Object.entries(variant.attributes)) {
      if (value) titleParts.push(value);
    }
  }

  const variantSuffix = titleParts.length > 0 ? ` - ${titleParts.join(" / ")}` : "";
  const title = truncate(`${product.name}${variantSuffix}`, 150);

  // Clean description
  const rawDescription = product.description || product.name;
  const description = truncate(stripHtml(rawDescription), 5000);

  // Product page URL
  const link = buildAbsoluteUrl(`/product/${product.slug}`);

  // Image handling: sorted by sort_order, primary first
  const sortedImages = [...product.images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const primaryImage = sortedImages[0];
  const imageLink = primaryImage
    ? buildAbsoluteUrl(primaryImage.url)
    : buildAbsoluteUrl("/placeholder-product.png");

  const additionalImages = sortedImages
    .slice(1, 11)
    .map((img) => buildAbsoluteUrl(img.url));

  // Availability
  const availability: ProductFeedItem["availability"] =
    variant.stock_quantity > 0 ? "in stock" : "out of stock";

  // Price: use sale_price as the listed price
  const price = formatFeedPrice(variant.sale_price, config.defaultCurrency);

  // Discount price → sale_price in feed terminology
  const salePrice =
    variant.discount_price && variant.discount_price < variant.sale_price
      ? formatFeedPrice(variant.discount_price, config.defaultCurrency)
      : undefined;

  // Brand: product brand or default
  const brand = product.brand || config.defaultBrand;

  // Product type / category breadcrumb
  const productType = product.category?.name ?? undefined;

  // Custom label: "featured" tag for audience segmentation
  const customLabel = product.is_featured ? "featured" : undefined;

  return {
    id,
    title,
    description,
    availability,
    condition: config.defaultCondition,
    price,
    link,
    image_link: imageLink,
    brand,
    ...(salePrice && { sale_price: salePrice }),
    ...(additionalImages.length > 0 && {
      additional_image_link: additionalImages,
    }),
    item_group_id: product.id,
    ...(variant.size && { size: variant.size }),
    ...(variant.color && { color: variant.color }),
    ...(variant.sku && { mpn: variant.sku }),
    ...(productType && { product_type: productType }),
    ...(customLabel && { custom_label_0: customLabel }),
  };
}

/**
 * Maps all products to feed items (one item per active variant).
 */
function mapProductsToFeedItems(
  products: FeedProduct[],
  config: FeedConfig,
): ProductFeedItem[] {
  const items: ProductFeedItem[] = [];

  for (const product of products) {
    // Skip products with no active variants
    if (!product.variants || product.variants.length === 0) {
      continue;
    }

    for (const variant of product.variants) {
      items.push(mapVariantToFeedItem(product, variant, config));
    }
  }

  return items;
}

/**
 * Generates the complete XML feed string.
 */
export async function generateXmlFeed(): Promise<string> {
  const config = getDefaultConfig();
  const products = await getCatalogFeedProducts();
  const items = mapProductsToFeedItems(products, config);

  return buildProductFeedXml(items, config);
}

/**
 * Generates the complete JSON feed object.
 */
export async function generateJsonFeed(): Promise<object> {
  const config = getDefaultConfig();
  const products = await getCatalogFeedProducts();
  const items = mapProductsToFeedItems(products, config);

  return buildProductFeedJson(items);
}
