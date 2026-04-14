import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  price: string;
  compare_at_price: string | null;
  url: string;
  in_stock: boolean;
}

function formatPrice(price: string): string {
  return `€${parseFloat(price).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}

function renderMarkdownToHtml(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, '<s style="color:#999">$1</s>')
    .replace(/^#{1,2} (.+)$/gm, '<h2 style="font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;margin:20px 0 8px;color:#0A1628;line-height:1.3">$1</h2>')
    .replace(/^#{3,6} (.+)$/gm, '<h3 style="font-family:Inter,Arial,sans-serif;font-size:16px;font-weight:600;margin:16px 0 6px;color:#0A1628;line-height:1.3">$1</h3>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0;font-family:Inter,Arial,sans-serif;font-size:15px;color:#333;line-height:1.6">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="padding-left:20px;margin:12px 0">$1</ul>')
    .replace(/→ (.+)/g, `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="height:40px;v-text-anchor:middle;width:200px" arcsize="15%" strokecolor="#0A1628" fillcolor="#0A1628"><center style="color:#fff;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600">→ $1</center></v:roundrect><![endif]--><a href="#" style="display:inline-block;background:#0A1628;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;margin:8px 0;mso-hide:all">→ $1</a>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" style="color:#00C9B1;text-decoration:underline">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin:12px 0;line-height:1.6;color:#333;font-family:Inter,Arial,sans-serif;font-size:15px">')
    .replace(/^(?!<[huap])/, '<p style="margin:12px 0;line-height:1.6;color:#333;font-family:Inter,Arial,sans-serif;font-size:15px">')
    .replace(/(?<![>])$/, "</p>");
}

function buildProductCardsHtml(products: Product[]): string {
  if (!products || products.length === 0) return "";

  const cards = products.map((p) => {
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.title}" width="100%" style="display:block;width:100%;border-radius:10px 10px 0 0" />`
      : "";
    const compareHtml = p.compare_at_price
      ? `<span style="font-size:12px;color:#999;text-decoration:line-through;margin-right:6px">${formatPrice(p.compare_at_price)}</span>`
      : "";
    const priceColor = p.compare_at_price ? "#dc2626" : "#0A1628";
    const ctaLabel = p.in_stock ? "Ordina ora →" : "Scopri →";

    return `<td style="width:50%;vertical-align:top;padding:8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff">
        <tr><td>${imgHtml}</td></tr>
        <tr><td style="padding:12px">
          <p style="font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:600;margin:0 0 4px;color:#0A1628;line-height:1.3">${p.title}</p>
          <p style="margin:0 0 10px">
            ${compareHtml}<span style="font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:700;color:${priceColor}">${formatPrice(p.price)}</span>
          </p>
          <a href="${p.url}" target="_blank" style="display:block;background:#0A1628;color:#ffffff;text-align:center;padding:8px 0;border-radius:6px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none">${ctaLabel}</a>
        </td></tr>
      </table>
    </td>`;
  });

  // Build rows of 2 products each
  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    const second = cards[i + 1] || "<td></td>";
    rows += `<tr>${cards[i]}${typeof second === "string" ? second : ""}</tr>`;
  }

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">${rows}</table>`;
}

function buildBrandedHtml(campaign: any, fromName: string): string {
  const bodyHtml = renderMarkdownToHtml(campaign.body_markdown || "");
  const products: Product[] = Array.isArray(campaign.products_data) ? campaign.products_data : [];
  const productCardsHtml = buildProductCardsHtml(products);

  const heroHtml = campaign.hero_image_url
    ? `<tr><td><img src="${campaign.hero_image_url}" alt="Hero" width="600" style="display:block;width:100%;max-height:320px;object-fit:cover" /></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>${campaign.subject_line || campaign.name}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0;padding:0;width:100%!important;background-color:#f3f4f6}
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
<center>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:20px 0">

<!-- Main container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">

<!-- Header -->
<tr><td style="background:#0A1628;padding:16px 24px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:#ffffff;font-family:Inter,Arial,sans-serif;font-weight:700;font-size:18px;letter-spacing:-0.5px">${fromName}</td>
<td align="right" style="font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:500"><a href="https://www.easysea.org" style="color:#00C9B1;text-decoration:none">easysea.org</a></td>
</tr>
</table>
</td></tr>

<!-- Hero image -->
${heroHtml}

<!-- Body -->
<tr><td style="padding:24px 32px">
${bodyHtml}
${productCardsHtml}
</td></tr>

<!-- Footer -->
<tr><td style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
<p style="font-family:Inter,Arial,sans-serif;font-size:11px;color:#9ca3af;margin:0">easysea® · Via dell'innovazione · Italia</p>
<p style="font-family:Inter,Arial,sans-serif;font-size:11px;color:#9ca3af;margin:4px 0 0">
<a href="{{ unsubscribe_url }}" style="color:#9ca3af;text-decoration:underline">Disiscriviti</a> · <a href="https://www.easysea.org" style="color:#00C9B1;text-decoration:none">easysea.org</a>
</p>
</td></tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
</center>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (!campaign) throw new Error("Campaign not found");

    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    const klaviyoKey = settings.klaviyo_api_key;
    if (!klaviyoKey) throw new Error("Klaviyo API key not configured in Brand Settings");

    const fromEmail = settings.klaviyo_from_email || "hello@easysea.org";
    const fromName = settings.klaviyo_from_name || "easysea®";
    const revision = "2024-10-15";
    const headers = {
      Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
      "Content-Type": "application/json",
      revision,
    };

    // 1. Build branded HTML
    const brandedHtml = buildBrandedHtml(campaign, fromName);

    // 2. Create Klaviyo template
    const templateRes = await fetch("https://a.klaviyo.com/api/templates/", {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "template",
          attributes: {
            name: `[EasyCopy] ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
            html: brandedHtml,
            editor_type: "CODE",
          },
        },
      }),
    });

    if (!templateRes.ok) {
      const err = await templateRes.text();
      console.error("Klaviyo template error:", templateRes.status, err);
      throw new Error(`Klaviyo template error ${templateRes.status}: ${err}`);
    }

    const templateData = await templateRes.json();
    const templateId = templateData?.data?.id;
    console.log("Created Klaviyo template:", templateId);

    // 3. Get Klaviyo list for audiences
    const listId = settings.klaviyo_list_id;
    let audienceListId = listId;
    if (!audienceListId) {
      // Fetch first available list from Klaviyo
      const listsRes = await fetch("https://a.klaviyo.com/api/lists/", { headers });
      console.log("Klaviyo lists response status:", listsRes.status);
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        console.log("Klaviyo lists count:", listsData?.data?.length, "first:", listsData?.data?.[0]?.id);
        audienceListId = listsData?.data?.[0]?.id;
      } else {
        const listsErr = await listsRes.text();
        console.error("Klaviyo lists error:", listsRes.status, listsErr);
      }
    }
    if (!audienceListId) {
      throw new Error("No Klaviyo list found. Configure 'klaviyo_list_id' in Brand Settings or create a list in Klaviyo.");
    }
    console.log("Using Klaviyo list:", audienceListId);

    // 4. Create campaign
    const campaignPayload = {
      data: {
        type: "campaign",
        attributes: {
          name: `[EasyCopy] ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
          audiences: {
            included: [audienceListId],
          },
          send_strategy: {
            method: "static",
            options_static: null,
          },
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
                  },
                },
              },
            ],
          },
        },
      },
    };

    const campaignRes = await fetch("https://a.klaviyo.com/api/campaigns/", {
      method: "POST",
      headers,
      body: JSON.stringify(campaignPayload),
    });

    if (!campaignRes.ok) {
      const err = await campaignRes.text();
      console.error("Klaviyo campaign error:", campaignRes.status, err);
      throw new Error(`Klaviyo campaign error ${campaignRes.status}: ${err}`);
    }

    const campaignData = await campaignRes.json();
    const klaviyoCampaignId = campaignData?.data?.id;
    const messageId = campaignData?.data?.relationships?.["campaign-messages"]?.data?.[0]?.id;
    console.log("Created Klaviyo campaign:", klaviyoCampaignId, "message:", messageId);

    // 4. Assign template to campaign message
    if (messageId && templateId) {
      const assignRes = await fetch(`https://a.klaviyo.com/api/campaign-messages/${messageId}/relationships/template/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          data: {
            type: "template",
            id: templateId,
          },
        }),
      });

      if (!assignRes.ok) {
        const err = await assignRes.text();
        console.error("Klaviyo assign template error:", assignRes.status, err);
        // Non-fatal — campaign still created
      } else {
        console.log("Template assigned to campaign message");
      }
    }

    const klaviyoUrl = klaviyoCampaignId
      ? `https://www.klaviyo.com/campaign/${klaviyoCampaignId}/edit`
      : null;

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
