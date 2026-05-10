import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_ACCESS: Record<string, string[]> = {
  "/admin/dashboard": ["admin", "super_admin", "manager", "storeman"],
  "/admin/pos": ["admin", "super_admin", "manager"],
  "/admin/products": ["admin", "super_admin", "storeman", "moderator"],
  "/admin/inventory": [
    "admin",
    "super_admin",
    "storeman",
    "manager",
    "moderator",
  ],
  "/admin/categories": ["admin", "super_admin"],
  "/admin/coupons": ["admin", "super_admin"],
  "/admin/orders": ["admin", "super_admin", "manager", "moderator"],
  "/admin/my-sales": ["moderator"],
  "/admin/moderators": ["admin", "super_admin"],
  "/admin/analytics": ["admin", "super_admin"],
  "/admin/users": ["admin", "super_admin"],
  "/admin/media": ["admin", "super_admin"],
  "/admin/settings": ["admin", "super_admin"],
};

const ROLE_DEFAULT_PAGE: Record<string, string> = {
  admin: "/admin/dashboard",
  super_admin: "/admin/dashboard",
  manager: "/admin/pos",
  storeman: "/admin/products",
  moderator: "/admin/my-sales",
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Role-based access control
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role || "storeman";

    // Moderators can view products but cannot open product create/edit screens
    if (
      role === "moderator" &&
      (request.nextUrl.pathname === "/admin/products/new" ||
        /^\/admin\/products\/[^/]+\/edit$/.test(request.nextUrl.pathname))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/products";
      return NextResponse.redirect(url);
    }

    // Find matching route rule
    const matchedRoute = Object.keys(ROLE_ACCESS).find(
      (route) =>
        request.nextUrl.pathname === route ||
        request.nextUrl.pathname.startsWith(route + "/"),
    );

    if (matchedRoute) {
      const allowedRoles = ROLE_ACCESS[matchedRoute];
      if (!allowedRoles.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_DEFAULT_PAGE[role] || "/admin/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
