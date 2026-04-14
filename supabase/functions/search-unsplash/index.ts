import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, page = 1, per_page = 20 } = await req.json();
    if (!query) throw new Error("query required");

    const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!accessKey) throw new Error("UNSPLASH_ACCESS_KEY not configured");

    const params = new URLSearchParams({
      query,
      page: String(page),
      per_page: String(per_page),
      orientation: "landscape",
    });

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Unsplash API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const photos = (data.results || []).map((p: any) => ({
      id: p.id,
      description: p.description || p.alt_description || "",
      urls: {
        small: p.urls.small,
        regular: p.urls.regular,
        full: p.urls.full,
      },
      user: {
        name: p.user.name,
        username: p.user.username,
      },
      width: p.width,
      height: p.height,
    }));

    return new Response(JSON.stringify({ photos, total: data.total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-unsplash error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
