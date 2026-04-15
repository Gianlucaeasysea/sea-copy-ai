import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const CANVA_API_KEY = Deno.env.get("CANVA_API_KEY");
    if (!CANVA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CANVA_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject_line, body_markdown, products, hero_image_url } = await req.json();

    // Step 1: Create a new Canva design
    const createResp = await fetch("https://api.canva.com/rest/v1/designs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CANVA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        design_type: { type: "preset", name: "emailHeader" },
        title: subject_line || "EasyCopy Email",
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error("Canva create error:", createResp.status, errText);
      return new Response(
        JSON.stringify({ error: `Canva API error ${createResp.status}: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const designData = await createResp.json();
    const editUrl = designData?.design?.urls?.edit_url || designData?.urls?.edit_url;
    const designId = designData?.design?.id || designData?.id;

    return new Response(
      JSON.stringify({
        success: true,
        design_id: designId,
        edit_url: editUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("push-to-canva error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
