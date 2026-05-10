// ─── Facebook Feed Utility Functions ───

/**
 * Escapes special XML characters to prevent injection and parsing errors.
 * Handles: & < > " '
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds an absolute URL from a relative path using NEXT_PUBLIC_SITE_URL.
 * If the path is already absolute (starts with http), returns it as-is.
 */
export function buildAbsoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${siteUrl}${cleanPath}`;
}

/**
 * Formats a price for Meta feed: number + space + ISO currency code.
 * Examples: "1590 BDT", "1299.50 BDT"
 * Meta requires no decimals for whole numbers, 2 decimals otherwise.
 */
export function formatFeedPrice(
  amount: number,
  currency: string = "BDT",
): string {
  const formatted = Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(2);

  return `${formatted} ${currency}`;
}

/**
 * Strips HTML tags from a string, returning plain text.
 * Used to clean product descriptions for the feed.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Truncates a string to a maximum length, appending "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
