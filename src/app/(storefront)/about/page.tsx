import { createAdminClient } from "@/lib/supabase/admin";

async function fetchPolicyContent(): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "policy_about_us")
      .single();
    return data?.value ?? "";
  } catch {
    return "";
  }
}

export default async function AboutPage() {
  const content = await fetchPolicyContent();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">About Us</h1>
      {content ? (
        <div className="prose prose-gray max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {content}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">
          Content not yet available. Please check back later.
        </p>
      )}
    </div>
  );
}
