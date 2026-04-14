import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load campaign
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (!campaign) throw new Error("Campaign not found");

    // Load brand settings
    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    const klaviyoKey = settings.klaviyo_api_key;
    if (!klaviyoKey) throw new Error("Klaviyo API key not configured in Brand Settings");

    const fromEmail = settings.klaviyo_from_email || "hello@easysea.org";
    const fromName = settings.klaviyo_from_name || "easysea®";

    // Convert markdown body to basic HTML
    const htmlBody = (campaign.body_markdown || "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<s>$1</s>")
      .replace(/^#{1,6} (.+)$/gm, "<h2>$1</h2>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");

    // Create Klaviyo campaign draft
    const payload = {
      data: {
        type: "campaign",
        attributes: {
          name: `[EasyCopy] ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
          channel: "email",
          "campaign-messages": {
            data: [
              {
                type: "campaign-message",
                attributes: {
                  channel: "email",
                  label: campaign.language === "en" ? "Email ENG" : "Email ITA",
                  content: {
                    subject: campaign.subject_line || campaign.name,
                    preview_text: campaign.preview_text || "",
                    from_email: fromEmail,
                    from_label: fromName,
                    reply_to_email: fromEmail,
                    body: htmlBody,
                  },
                },
              },
            ],
          },
        },
      },
    };

    const klaviyoRes = await fetch("https://a.klaviyo.com/api/campaigns/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
        "Content-Type": "application/json",
        revision: "2024-10-15",
      },
      body: JSON.stringify(payload),
    });

    if (!klaviyoRes.ok) {
      const err = await klaviyoRes.text();
      console.error("Klaviyo error:", klaviyoRes.status, err);
      throw new Error(`Klaviyo error ${klaviyoRes.status}: ${err}`);
    }

    const klaviyoData = await klaviyoRes.json();
    const klaviyoCampaignId = klaviyoData?.data?.id;
    const klaviyoUrl = klaviyoCampaignId
      ? `https://www.klaviyo.com/campaign/${klaviyoCampaignId}/edit`
      : null;

    // Save Klaviyo campaign ID back to the campaign record
    await supabase
      .from("campaigns")
      .update({ klaviyo_campaign_id: klaviyoCampaignId, status: "approved" })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, klaviyo_campaign_id: klaviyoCampaignId, klaviyo_url: klaviyoUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("push-to-klaviyo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
