import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MapPin, Phone, Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/icons/SocialIcons";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = [
  { href: "/category/club-jersey", label: "Club Jersey" },
  { href: "/category/national-team", label: "World Cup / National Team" },
  { href: "/category/retro", label: "Retro Jersey" },
  { href: "/category/winter", label: "Winter" },
  { href: "/category/trouser", label: "Trouser" },
  { href: "/category/football-accessories", label: "Football Accessories" },
];

const HELP_LINKS = [
  { href: "/track-order", label: "Track Your Order" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/returns", label: "Returns & Exchange" },
  { href: "/privacy", label: "Privacy Policy" },
];

// Fallback values if settings are not configured
const DEFAULT_VALUES = {
  footer_brand_description:
    "A trusted destination for cutting-edge accessories and mobile marvels.",
  footer_phone: "01313542742",
  footer_email: "info@evolutiongadget.com",
  footer_address: "Dhaka, Bangladesh",
};

async function fetchFooterSettings() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", [
        "footer_phone",
        "footer_email",
        "footer_address",
        "footer_facebook_url",
        "footer_instagram_url",
        "footer_brand_description",
        "footer_google_maps_url",
      ]);

    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value ?? "";
    }
    return settings;
  } catch {
    return {};
  }
}

export async function Footer() {
  const settings = await fetchFooterSettings();

  const brandDescription =
    settings.footer_brand_description ||
    DEFAULT_VALUES.footer_brand_description;
  const phone = settings.footer_phone || DEFAULT_VALUES.footer_phone;
  const email = settings.footer_email || DEFAULT_VALUES.footer_email;
  const address = settings.footer_address || DEFAULT_VALUES.footer_address;
  const facebookUrl = settings.footer_facebook_url || "";
  const instagramUrl = settings.footer_instagram_url || "";
  const mapsUrl = settings.footer_google_maps_url || "";

  return (
    <footer className="bg-[var(--theme-dark)] text-[#E5E5E5]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo className="[&_span]:text-primary" />
            <p className="text-sm leading-relaxed">{brandDescription}</p>
            <div className="flex gap-3">
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="size-4" />
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-primary mb-4">Categories</h3>
            <ul className="space-y-2">
              {CATEGORIES.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-primary transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-primary mb-4">Help</h3>
            <ul className="space-y-2">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-primary transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-primary mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="size-4 mt-0.5 shrink-0" />
                <a
                  href={`tel:${phone}`}
                  className="hover:text-primary transition"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="size-4 mt-0.5 shrink-0" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-primary transition"
                >
                  {email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition"
                  >
                    {address}
                  </a>
                ) : (
                  <span>{address}</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} Evolution Gadget. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
