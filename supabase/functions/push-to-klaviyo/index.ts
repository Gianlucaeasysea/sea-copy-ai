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

// ─── easysea® Brand Book Marzo 2026 tokens ──────────────────────────────────
const BLACK = "#040603";
const WHITE = "#FFFFFF";
const BLUE = "#0047BA";
const GRAY900 = "#0a0a0a";
const GRAY700 = "#2a2a2a";
const GRAY500 = "#6b6b6b";
const GRAY300 = "#cfcfcf";
const HEAD_FONT = "'Big Shoulders Display', Impact, 'Arial Black', sans-serif";
const BODY_FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const TECH_FONT = "'Barlow Condensed', Montserrat, Arial, sans-serif";
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Big+Shoulders+Display:wght@700;800;900&family=Barlow+Condensed:wght@500;600;700&display=swap";

function renderMarkdownToHtml(md: string, dark = false): string {
  const fg = dark ? WHITE : BLACK;
  const bodyColor = dark ? GRAY300 : GRAY700;
  const linkColor = BLUE;
  const ctaBg = BLUE;
  const strikeFg = GRAY500;

  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, `<s style="color:${strikeFg}">$1</s>`)
    .replace(/^#{1,2} (.+)$/gm, `<h2 style="font-family:${HEAD_FONT};font-size:32px;font-weight:800;margin:28px 0 14px;color:${fg};line-height:1.05;letter-spacing:-0.5px;text-transform:uppercase">$1</h2>`)
    .replace(/^#{3,6} (.+)$/gm, `<h3 style="font-family:${TECH_FONT};font-size:14px;font-weight:600;margin:20px 0 8px;color:${fg};line-height:1.2;text-transform:uppercase;letter-spacing:1.5px">$1</h3>`)
    .replace(/^[-*] (.+)$/gm, `<li style="margin:6px 0;font-family:${BODY_FONT};font-size:15px;color:${bodyColor};line-height:1.7">$1</li>`)
    .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="padding-left:20px;margin:14px 0">$1</ul>')
    .replace(/→ \[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" target="_blank" style="display:inline-block;background:${ctaBg};color:${WHITE};padding:14px 32px;border-radius:0;text-decoration:none;font-family:${TECH_FONT};font-size:13px;font-weight:600;margin:16px 0;letter-spacing:2px;text-transform:uppercase">$1</a>`)
    .replace(/→ (.+)/g, `<a href="#" style="display:inline-block;background:${ctaBg};color:${WHITE};padding:14px 32px;border-radius:0;text-decoration:none;font-family:${TECH_FONT};font-size:13px;font-weight:600;margin:16px 0;letter-spacing:2px;text-transform:uppercase">$1</a>`)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" style="display:block;max-width:100%;margin:20px 0" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" style="color:${linkColor};text-decoration:underline">$1</a>`)
    .replace(/\n\n/g, `</p><p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BODY_FONT};font-size:15px">`)
    .replace(/^(?!<[huap])/, `<p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BODY_FONT};font-size:15px">`)
    .replace(/(?<![>])$/, "</p>");
}

function buildProductCardsHtml(products: Product[], dark: boolean): string {
  if (!products || products.length === 0) return "";
  const cardBg = dark ? GRAY900 : WHITE;
  const cardBorder = dark ? "1px solid #1a1a1a" : `1px solid ${BLACK}`;
  const titleColor = dark ? WHITE : BLACK;

  const cards = products.map((p) => {
    const imgHtml = p.image_url
      ? `<a href="${p.url}" target="_blank" style="display:block"><img src="${p.image_url}" alt="${p.title}" width="100%" style="display:block;width:100%" /></a>`
      : "";
    const compareHtml = p.compare_at_price
      ? `<span style="font-size:12px;color:${GRAY500};text-decoration:line-through;margin-right:8px;font-family:${BODY_FONT}">${formatPrice(p.compare_at_price)}</span>`
      : "";
    const priceColor = p.compare_at_price ? BLUE : titleColor;
    const ctaLabel = p.in_stock ? "Ordina ora" : "Scopri";

    return `<td style="width:50%;vertical-align:top;padding:8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:${cardBorder};background:${cardBg}">
        <tr><td>${imgHtml}</td></tr>
        <tr><td style="padding:16px">
          <p style="font-family:${TECH_FONT};font-size:13px;font-weight:600;margin:0 0 8px;color:${titleColor};line-height:1.25;text-transform:uppercase;letter-spacing:1px">${p.title}</p>
          <p style="margin:0 0 14px">${compareHtml}<span style="font-family:${BODY_FONT};font-size:15px;font-weight:700;color:${priceColor}">${formatPrice(p.price)}</span></p>
          <a href="${p.url}" target="_blank" style="display:block;background:${BLUE};color:${WHITE};text-align:center;padding:12px 0;border-radius:0;font-family:${TECH_FONT};font-size:12px;font-weight:600;text-decoration:none;letter-spacing:2px;text-transform:uppercase">${ctaLabel}</a>
        </td></tr>
      </table>
    </td>`;
  });

  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    rows += `<tr>${cards[i]}${cards[i + 1] || "<td></td>"}</tr>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">${rows}</table>`;
}

function shellHtml(inner: string, opts: { dark: boolean; subject: string }): string {
  const bg = opts.dark ? BLACK : WHITE;
  return `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>${opts.subject}</title>
<link href="${FONT_LINK}" rel="stylesheet"/>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0;padding:0;width:100%!important;background-color:${bg}}
</style>
</head>
<body style="margin:0;padding:0;background-color:${bg}">
<center>${inner}</center>
</body></html>`;
}

// ── LIGHT (Classic): white bg, black header bar, blue CTA ─────────────────────
function buildBrandedHtml(campaign: any, fromName: string): string {
  const bodyHtml = renderMarkdownToHtml(campaign.body_markdown || "", false);
  const products: Product[] = Array.isArray(campaign.products_data) ? campaign.products_data : [];
  const productCardsHtml = buildProductCardsHtml(products, false);

  const heroHtml = campaign.hero_image_url
    ? `<tr><td><img src="${campaign.hero_image_url}" alt="" width="600" style="display:block;width:100%;max-height:380px;object-fit:cover" /></td></tr>`
    : "";

  const subject = campaign.subject_line || campaign.name;
  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${WHITE}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${WHITE}">

<tr><td style="background:${BLACK};padding:22px 32px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:${WHITE};font-family:${HEAD_FONT};font-weight:800;font-size:22px;letter-spacing:-0.5px;text-transform:lowercase">easysea<span style="font-size:11px;vertical-align:super;font-weight:400">®</span></td>
<td align="right" style="font-family:${TECH_FONT};font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase"><a href="https://www.easysea.org" style="color:${WHITE};text-decoration:none">easysea.org</a></td>
</tr></table>
</td></tr>

${heroHtml}

<tr><td style="padding:32px 32px 16px">${bodyHtml}${productCardsHtml}</td></tr>

<tr><td style="background:${BLACK};padding:24px 32px;text-align:center">
<p style="font-family:${TECH_FONT};font-size:10px;color:${WHITE};margin:0;letter-spacing:2px;text-transform:uppercase">EASYSEA® · NAUTICAL ACCESSORIES · ITALY</p>
<p style="font-family:${BODY_FONT};font-size:11px;color:${GRAY300};margin:10px 0 0">Via Per Curnasco 52 · Bergamo 24127 · Italia</p>
<p style="font-family:${BODY_FONT};font-size:11px;margin:8px 0 0">
<a href="{{ unsubscribe_url }}" style="color:${GRAY300};text-decoration:underline">Disiscriviti</a>
<span style="color:${GRAY500};margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${WHITE};text-decoration:none;font-weight:500">easysea.org</a>
</p>
</td></tr>

</table>
</td></tr></table>`;
  return shellHtml(inner, { dark: false, subject });
}

// ── DARK: black bg, blue accents, minimal ─────────────────────────────────────
function buildDarkBrandedHtml(campaign: any, fromName: string): string {
  const bodyHtml = renderMarkdownToHtml(campaign.body_markdown || "", true);
  const products: Product[] = Array.isArray(campaign.products_data) ? campaign.products_data : [];
  const productCardsHtml = buildProductCardsHtml(products, true);

  const heroHtml = campaign.hero_image_url
    ? `<tr><td><img src="${campaign.hero_image_url}" alt="" width="600" style="display:block;width:100%;max-height:420px;object-fit:cover" /></td></tr>`
    : "";

  const subject = campaign.subject_line || campaign.name;
  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BLACK}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BLACK}">

<tr><td style="padding:28px 32px 20px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:${WHITE};font-family:${HEAD_FONT};font-weight:800;font-size:24px;letter-spacing:-0.5px;text-transform:lowercase">easysea<span style="font-size:12px;vertical-align:super;font-weight:400;color:${GRAY300}">®</span></td>
<td align="right"><a href="https://www.easysea.org" style="font-family:${TECH_FONT};font-size:11px;font-weight:600;color:${WHITE};text-decoration:none;letter-spacing:2px;text-transform:uppercase">easysea.org</a></td>
</tr></table>
</td></tr>

${heroHtml}

<tr><td style="padding:36px 32px 16px">${bodyHtml}${productCardsHtml}</td></tr>

<tr><td style="padding:32px 32px 28px;border-top:1px solid #1a1a1a;text-align:center">
<p style="font-family:${TECH_FONT};font-size:10px;color:${GRAY300};margin:0;letter-spacing:2.5px;text-transform:uppercase">EASYSEA® — DESIGN AS FUNCTION</p>
<p style="font-family:${BODY_FONT};font-size:11px;color:${GRAY500};margin:12px 0 0">Via Per Curnasco 52 · Bergamo 24127 · Italia</p>
<p style="font-family:${BODY_FONT};font-size:11px;margin:10px 0 0">
<a href="{{ unsubscribe_url }}" style="color:${GRAY500};text-decoration:underline">Unsubscribe</a>
<span style="color:${GRAY700};margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${BLUE};text-decoration:none;font-weight:600">easysea.org</a>
</p>
</td></tr>

</table>
</td></tr></table>`;
  return shellHtml(inner, { dark: true, subject });
}

// ── Plain text: minimal, personal ─────────────────────────────────────────────
function buildPlainTextHtml(campaign: any, fromName: string): string {
  const bodyHtml = (campaign.body_markdown || "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, "<s>$1</s>")
    .replace(/^#{1,6} (.+)$/gm, `<h3 style="margin:20px 0 8px;font-family:${TECH_FONT};font-size:13px;font-weight:600;color:${BLACK};text-transform:uppercase;letter-spacing:1.5px">$1</h3>`)
    .replace(/^[-*] (.+)$/gm, "<li style='margin:6px 0'>$1</li>")
    .replace(/(<li[^>]*>.*<\/li>)/gs, "<ul style='padding-left:18px;margin:12px 0'>$1</ul>")
    .replace(/→ \[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href='$2' style='color:${BLUE};font-weight:600'>$1 →</a>`)
    .replace(/→ (.+)/g, `<a href='#' style='color:${BLUE};font-weight:600'>$1 →</a>`)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" style="display:block;max-width:100%;margin:16px 0" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href='$2' style='color:${BLUE};text-decoration:underline'>$1</a>`)
    .replace(/\n\n/g, `</p><p style='margin:14px 0;line-height:1.75;color:${GRAY700};font-family:${BODY_FONT};font-size:16px'>`)
    .replace(/^/, `<p style='margin:14px 0;line-height:1.75;color:${GRAY700};font-family:${BODY_FONT};font-size:16px'>`)
    .replace(/$/, "</p>");

  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${WHITE}">
<tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
  <tr><td style="padding-bottom:24px;border-bottom:1px solid ${GRAY300}">
    <p style="font-family:${TECH_FONT};font-size:12px;color:${GRAY500};margin:0;text-transform:uppercase;letter-spacing:2px">${fromName}</p>
  </td></tr>
  <tr><td style="padding-top:24px">${bodyHtml}</td></tr>
  <tr><td style="padding-top:32px;border-top:1px solid ${GRAY300}">
    <p style="font-family:${BODY_FONT};font-size:11px;color:${GRAY500};margin:0">
      <a href="{{ unsubscribe_url }}" style="color:${GRAY500};text-decoration:underline">Disiscriviti</a>
      &nbsp;·&nbsp; ${fromName}
    </p>
  </td></tr>
</table>
</td></tr></table>`;
  return shellHtml(inner, { dark: false, subject: campaign.subject_line || campaign.name });
}

// ── Template (sectioned, for Klaviyo CODE editor) ─────────────────────────────
function buildSectionedHtml(campaign: any, fromName: string): string {
  const bodyHtml = renderMarkdownToHtml(campaign.body_markdown || "", true);
  const products: Product[] = Array.isArray(campaign.products_data) ? campaign.products_data : [];
  const productCardsHtml = buildProductCardsHtml(products, true);

  const heroSection = campaign.hero_image_url
    ? `<!-- SECTION: HERO -->
<tr data-section="hero"><td><img src="${campaign.hero_image_url}" alt="" width="600" style="display:block;width:100%;max-height:420px;object-fit:cover"/></td></tr>
<!-- /SECTION: HERO -->`
    : "<!-- SECTION: HERO [vuoto] --><!-- /SECTION: HERO -->";

  const productsSection = products.length > 0
    ? `<!-- SECTION: PRODOTTI -->
<tr data-section="products"><td style="padding:0 32px 16px">${productCardsHtml}</td></tr>
<!-- /SECTION: PRODOTTI -->`
    : "<!-- SECTION: PRODOTTI [vuoto] --><!-- /SECTION: PRODOTTI -->";

  const subject = campaign.subject_line || campaign.name;
  const inner = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BLACK}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BLACK}">

<!-- SECTION: HEADER -->
<tr data-section="header"><td style="padding:28px 32px 20px">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="color:${WHITE};font-family:${HEAD_FONT};font-weight:800;font-size:24px;letter-spacing:-0.5px;text-transform:lowercase">easysea<span style="font-size:12px;vertical-align:super;font-weight:400;color:${GRAY300}">®</span></td>
<td align="right"><a href="https://www.easysea.org" style="font-family:${TECH_FONT};font-size:11px;font-weight:600;color:${WHITE};text-decoration:none;letter-spacing:2px;text-transform:uppercase">easysea.org</a></td>
</tr></table>
</td></tr>
<!-- /SECTION: HEADER -->

${heroSection}

<!-- SECTION: BODY -->
<tr data-section="body"><td style="padding:36px 32px 16px">${bodyHtml}</td></tr>
<!-- /SECTION: BODY -->

${productsSection}

<!-- SECTION: FOOTER -->
<tr data-section="footer"><td style="padding:32px 32px 28px;border-top:1px solid #1a1a1a;text-align:center">
<p style="font-family:${TECH_FONT};font-size:10px;color:${GRAY300};margin:0;letter-spacing:2.5px;text-transform:uppercase">EASYSEA® — DESIGN AS FUNCTION</p>
<p style="font-family:${BODY_FONT};font-size:11px;color:${GRAY500};margin:12px 0 0">Via Per Curnasco 52 · Bergamo 24127 · Italia</p>
<p style="font-family:${BODY_FONT};font-size:11px;margin:10px 0 0">
<a href="{{ unsubscribe_url }}" style="color:${GRAY500};text-decoration:underline">Unsubscribe</a>
<span style="color:${GRAY700};margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${BLUE};text-decoration:none;font-weight:600">easysea.org</a>
</p>
</td></tr>
<!-- /SECTION: FOOTER -->

</table>
</td></tr></table>`;
  return shellHtml(inner, { dark: true, subject });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id, branded_style, output_format } = await req.json();
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

    // Scegli HTML in base al formato richiesto
    let brandedHtml: string;
    const fmt = output_format || (branded_style ? "html_dark" : "html_light");
    if (fmt === "plaintext") {
      brandedHtml = buildPlainTextHtml(campaign, fromName);
    } else if (fmt === "template") {
      brandedHtml = buildSectionedHtml(campaign, fromName);
    } else if (fmt === "html_dark") {
      brandedHtml = buildDarkBrandedHtml(campaign, fromName);
    } else {
      brandedHtml = buildBrandedHtml(campaign, fromName);
    }

    // 2. Create Klaviyo template
    const templateRes = await fetch("https://a.klaviyo.com/api/templates/", {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "template",
          attributes: {
            name: `${(campaign.language || "it").toUpperCase()} | [EasyCopy] ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
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

    // Se il formato è "template", salva solo il template e ritorna senza creare campaign
    if (fmt === "template") {
      const templateUrl = templateId
        ? `https://www.klaviyo.com/email-marketing/templates`
        : null;
      return new Response(
        JSON.stringify({
          success: true,
          format: "template",
          klaviyo_template_id: templateId,
          klaviyo_url: templateUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get first Klaviyo list for audiences (user will set the real list in Klaviyo)
    const listsRes = await fetch("https://a.klaviyo.com/api/lists/", { headers });
    let audienceListId: string | undefined;
    if (listsRes.ok) {
      const listsData = await listsRes.json();
      audienceListId = listsData?.data?.[0]?.id;
    }
    if (!audienceListId) {
      throw new Error("No Klaviyo list found. Create at least one list in Klaviyo.");
    }

    // 4. Create campaign
    const campaignPayload = {
      data: {
        type: "campaign",
        attributes: {
          name: `${(campaign.language || "it").toUpperCase()} | [EasyCopy] ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
          audiences: {
            included: [audienceListId],
          },
          send_strategy: {
            method: "static",
            options_static: {
              datetime: new Date(Date.now() + 3600000).toISOString(),
            },
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
