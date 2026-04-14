import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractFeatures(html: string): string[] {
  const items: string[] = [];
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  for (const li of liMatches) {
    const text = li.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (text.length > 3) items.push(text);
  }
  const strongMatches = html.match(/<strong[^>]*>([\s\S]*?)<\/strong>/gi) || [];
  for (const s of strongMatches) {
    const text = s.replace(/<[^>]+>/g, "").trim();
    if (text.length > 2 && text.length < 80 && !items.includes(text)) items.push(text);
  }
  return [...new Set(items)].slice(0, 30);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product_id } = await req.json();
    if (!product_id) throw new Error("product_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    let storeUrl = settings.shopify_store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
    const adminMatch = storeUrl.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (adminMatch) storeUrl = `${adminMatch[1]}.myshopify.com`;
    if (storeUrl && !storeUrl.includes(".")) storeUrl = `${storeUrl}.myshopify.com`;
    const token = settings.shopify_admin_token;
    if (!storeUrl || !token) throw new Error("Shopify credentials not configured");

    const base = `https://${storeUrl}/admin/api/2024-01`;
    const headers = { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };

    const [productRes, metafieldsRes] = await Promise.all([
      fetch(`${base}/products/${product_id}.json`, { headers }),
      fetch(`${base}/products/${product_id}/metafields.json?limit=250`, { headers }),
    ]);

    if (!productRes.ok) {
      const errorBody = await productRes.text();
      throw new Error(`Shopify product fetch failed: ${productRes.status} - ${errorBody.slice(0, 200)}`);
    }

    const productJson = await productRes.json();
    const p = productJson.product;

    const metafieldsJson = metafieldsRes.ok ? await metafieldsRes.json() : { metafields: [] };
    const metafields: any[] = metafieldsJson.metafields || [];

    const specs = metafields
      .filter((m: any) => m.value && String(m.value).length < 500)
      .map((m: any) => ({
        namespace: m.namespace,
        key: m.key,
        label: m.key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        value: String(m.value),
        type: m.type,
      }));

    const images = (p.images || []).map((img: any, i: number) => ({
      index: i,
      src: img.src,
      alt: img.alt || p.title,
      width: img.width,
      height: img.height,
      is_primary: i === 0,
    }));

    const variants = (p.variants || []).map((v: any) => ({
      id: String(v.id),
      title: v.title,
      price: v.price,
      compare_at_price: v.compare_at_price,
      sku: v.sku,
      inventory_quantity: v.inventory_quantity || 0,
      available: (v.inventory_quantity || 0) > 0,
    }));

    const features = extractFeatures(p.body_html || "");
    const descriptionText = stripHtml(p.body_html || "");

    return new Response(
      JSON.stringify({
        id: String(p.id),
        title: p.title,
        handle: p.handle,
        product_type: p.product_type,
        tags: p.tags,
        description_html: p.body_html || "",
        description_text: descriptionText,
        features,
        images,
        variants,
        specs,
        url: `https://www.easysea.org/products/${p.handle}`,
        primary_image: images[0]?.src || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-product-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
