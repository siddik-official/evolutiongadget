import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `৳${price.toLocaleString("en-BD")}`;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VS-${timestamp}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function validateBDPhone(phone: string): boolean {
  // Bangladesh phone: 01[3-9]XXXXXXXX (11 digits)
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  return bdPhoneRegex.test(phone.replace(/[\s-+]/g, "").replace(/^880/, "0"));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-+]/g, "").replace(/^880/, "0");
}

/**
 * Format variant info including size and custom attributes
 * Example: "Size: M · Sleeves: Half Sleeve"
 */
export function formatVariantInfo(
  size: string,
  attributes?: Record<string, string> | null,
): string {
  const parts: string[] = [`Size: ${size}`];

  if (attributes && typeof attributes === "object") {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value) {
        // Capitalize key and format nicely
        const formattedKey =
          key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        parts.push(`${formattedKey}: ${value}`);
      }
    });
  }

  return parts.join(" · ");
}

/**
 * Format variant info in short form (for cart items, order summary)
 * Example: "M · Half Sleeve"
 */
export function formatVariantShort(
  size: string,
  attributes?: Record<string, string> | null,
): string {
  const parts: string[] = [size];

  if (attributes && typeof attributes === "object") {
    Object.values(attributes).forEach((value) => {
      if (value) {
        parts.push(value);
      }
    });
  }

  return parts.join(" · ");
}
