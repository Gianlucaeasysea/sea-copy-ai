import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FRAMEWORK_TEMPLATES: Record<string, string> = {
  "AIDA": "Structure: Attention → Interest → Desire → Action. Start with a bold hook, build interest with benefits, create desire with social proof or scarcity, end with clear CTA.",
  "PAS": "Structure: Problem → Agitate → Solution. Identify a pain point, amplify it emotionally, then present the product as the solution.",
  "SOAP Opera Sequence": "Structure: Setting → Drama → Backstory → Wall → Epiphany → Solution. Tell a story that leads to the product reveal.",
  "Before-After-Bridge": "Structure: Before (current pain) → After (ideal outcome) → Bridge (how the product gets you there).",
  "4 Ps": "Structure: Promise → Picture → Proof → Push. Make a promise, paint a vivid picture, show proof, push to action.",
  "StoryBrand": "Structure: Character → Problem → Guide → Plan → Call to Action → Success → Failure avoidance. Position the customer as hero, brand as guide.",
  "Feature-Benefit-Proof": "Structure: List features, explain benefits of each, provide proof (reviews, data, guarantees).",
  "Plain Broadcast": "Structure: Direct, conversational announcement. No heavy framework. Just inform clearly and link.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load campaign
    const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaign_id).single();
    if (!campaign) throw new Error("Campaign not found");

    // Load brand settings
    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    // Load active corrections
    const { data: corrections } = await supabase
      .from("corrections")
      .select("*")
      .eq("is_active", true)
      .or(`language.eq.${campaign.language},language.eq.all`);

    // Build correction rules
    let correctionRules = "";
    if (corrections && corrections.length > 0) {
      correctionRules = "\n\nSTYLE RULES FROM PAST CORRECTIONS:\n" +
        corrections.map((c: any) => `- Do NOT write "${c.original_text}". Instead write "${c.corrected_text}". (${c.category})`).join("\n");
    }

    // Build framework instruction
    const frameworkGuide = FRAMEWORK_TEMPLATES[campaign.framework] || FRAMEWORK_TEMPLATES["Plain Broadcast"];

    // Build system prompt
    const systemPrompt = `You are an expert email marketing copywriter for easysea®, an Italian sailing gear brand.

BRAND VOICE: ${settings.brand_voice || "Energetic, direct, technical but accessible."}
PERSONA FALLBACK: ${settings.persona_fallback || "Sea Lover"}
${correctionRules}

EMAIL FRAMEWORK: ${campaign.framework}
${frameworkGuide}

SUBJECT LINE TONE: ${campaign.subject_tone || "curiosity"}

LANGUAGE: Write in ${campaign.language === "it" ? "Italian" : campaign.language === "en" ? "English" : "both Italian and English (clearly separated)"}

Generate the following sections in this exact format:

## Subject Line
[One compelling subject line]

## Preview Text
[Short preview text, max 90 chars]

## Email Body
[Full email body using the ${campaign.framework} framework. Use markdown for formatting.]

## WhatsApp Version
[Short version, max 5 lines + link placeholder. Casual, direct tone.]`;

    const userPrompt = `Campaign: "${campaign.name}"
Type: ${campaign.type}
${campaign.context_notes ? `Context: ${campaign.context_notes}` : ""}

Generate the email and WhatsApp copy now.`;

    // Call Lovable AI with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("generate-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
