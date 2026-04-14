import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    let storeUrl = settings.shopify_store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
    // Handle admin URL format: admin.shopify.com/store/{store-name} → {store-name}.myshopify.com
    const adminMatch = storeUrl.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (adminMatch) {
      storeUrl = `${adminMatch[1]}.myshopify.com`;
    }
    // Handle bare store name without .myshopify.com
    if (storeUrl && !storeUrl.includes(".")) {
      storeUrl = `${storeUrl}.myshopify.com`;
    }
    const token = settings.shopify_admin_token;
    if (!storeUrl || !token) throw new Error("Shopify credentials not configured in Brand Settings");

    const excludedTags = (settings.excluded_tags || "")
      .split(",")
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean);

    const base = `https://${storeUrl}/admin/api/2024-01`;
    const headers = { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };

    // Fetch all products
    let products: any[] = [];
    let pageUrl = `${base}/products.json?limit=250&status=active`;

    while (pageUrl) {
      const res = await fetch(pageUrl, { headers });
      if (!res.ok) throw new Error(`Shopify products error: ${res.status}`);
      const json = await res.json();
      products = products.concat(json.products || []);

      const linkHeader = res.headers.get("Link") || "";
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      pageUrl = nextMatch ? nextMatch[1] : "";
    }

    // Filter out excluded tags
    if (excludedTags.length > 0) {
      products = products.filter((p: any) => {
        const productTags = (p.tags || "").split(",").map((t: string) => t.trim().toLowerCase());
        return !excludedTags.some((excluded: string) => productTags.includes(excluded));
      });
    }

    const shapedProducts = products.map((p: any) => {
      const variant = p.variants?.[0] || {};
      const image = p.images?.[0]?.src || null;
      const totalInventory = (p.variants || []).reduce(
        (sum: number, v: any) => sum + (v.inventory_quantity || 0), 0
      );

      return {
        id: String(p.id),
        title: p.title,
        handle: p.handle,
        product_type: p.product_type || "",
        tags: p.tags || "",
        image_url: image,
        images: (p.images || []).map((img: any) => img.src),
        price: variant.price,
        compare_at_price: variant.compare_at_price || null,
        in_stock: totalInventory > 0,
        inventory_quantity: totalInventory,
        url: `https://www.easysea.org/products/${p.handle}`,
        variants_count: p.variants?.length || 1,
      };
    });

    // Fetch collections
    const [customRes, smartRes] = await Promise.all([
      fetch(`${base}/custom_collections.json?limit=250`, { headers }),
      fetch(`${base}/smart_collections.json?limit=250`, { headers }),
    ]);

    const customJson = customRes.ok ? await customRes.json() : { custom_collections: [] };
    const smartJson = smartRes.ok ? await smartRes.json() : { smart_collections: [] };

    const collections = [
      ...(customJson.custom_collections || []),
      ...(smartJson.smart_collections || []),
    ].map((c: any) => ({
      id: String(c.id),
      title: c.title,
      handle: c.handle,
      image_url: c.image?.src || null,
      url: `https://www.easysea.org/collections/${c.handle}`,
    }));

    return new Response(
      JSON.stringify({ products: shapedProducts, collections }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-shopify-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
