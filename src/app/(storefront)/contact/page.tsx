import { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Contact Us | Evolution Gadget",
  description:
    "Get in touch with Evolution Gadget. Contact us for any questions about your orders, products, or general inquiries.",
};

async function fetchContactSettings() {
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

export default async function ContactPage() {
  const settings = await fetchContactSettings();

  const phone = settings.footer_phone || "01313542742";
  const email = settings.footer_email || "info@evolutiongadget.com";
  const address = settings.footer_address || "Dhaka, Bangladesh";
  const facebookUrl = settings.footer_facebook_url || "";

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-muted-foreground">
            Have a question? We&apos;re here to help. Reach out to us through
            any of the following channels.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Phone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="size-5 text-primary" />
                Call Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`tel:${phone}`}
                className="text-xl font-semibold text-primary hover:underline"
              >
                {phone}
              </a>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="size-4" />
                Available: 10 AM - 10 PM (Everyday)
              </p>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="size-5 text-green-600" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`https://wa.me/88${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button className="bg-green-600 hover:bg-green-700">
                  <MessageCircle className="size-4 mr-2" />
                  Chat on WhatsApp
                </Button>
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                Quick responses on WhatsApp
              </p>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="size-5 text-primary" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`mailto:${email}`}
                className="text-lg font-medium text-primary hover:underline"
              >
                {email}
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                We typically respond within 24 hours
              </p>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="size-5 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{address}</p>
              <p className="text-sm text-muted-foreground mt-2">
                (Online store - no physical showroom)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Social Links */}
        {facebookUrl && (
          <Card className="mb-10">
            <CardHeader>
              <CardTitle className="text-lg">Follow Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <svg
                    className="size-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook Page
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link
                href="/track-order"
                className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition"
              >
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-medium">Track Your Order</p>
                  <p className="text-sm text-muted-foreground">
                    Check delivery status
                  </p>
                </div>
              </Link>
              <Link
                href="/returns"
                className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition"
              >
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-medium">Returns & Exchange</p>
                  <p className="text-sm text-muted-foreground">
                    Our return policy
                  </p>
                </div>
              </Link>
              <Link
                href="/shipping"
                className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition"
              >
                <span className="text-2xl">🚚</span>
                <div>
                  <p className="font-medium">Shipping Info</p>
                  <p className="text-sm text-muted-foreground">
                    Delivery times & fees
                  </p>
                </div>
              </Link>
              <Link
                href="/products"
                className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition"
              >
                <span className="text-2xl">👕</span>
                <div>
                  <p className="font-medium">Browse Products</p>
                  <p className="text-sm text-muted-foreground">
                    View all jerseys
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
