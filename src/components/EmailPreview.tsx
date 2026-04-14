import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paintbrush, LayoutTemplate } from "lucide-react";

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  price: string;
  compare_at_price: string | null;
  url: string;
  in_stock: boolean;
}

interface EmailPreviewProps {
  subjectLine: string;
  previewText: string;
  bodyMarkdown: string;
  whatsappCopy: string;
  heroImageUrl?: string | null;
  products?: Product[];
  language?: string;
  branded?: boolean;
  onBrandedChange?: (branded: boolean) => void;
}

/* ─── Brand tokens from easysea.org ─── */
const BRAND = {
  black: "#000000",
  darkBg: "#0a0a0a",
  cardBg: "#111111",
  white: "#ffffff",
  gray: "#999999",
  lightGray: "#cccccc",
  blue: "#4355DB",
  blueLight: "#5a6bef",
  teal: "#00C9B1",
  font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

/* ─── Shared markdown renderer ─── */
function renderMarkdown(md: string, dark: boolean): string {
  const fg = dark ? BRAND.white : "#0A1628";
  const bodyColor = dark ? BRAND.lightGray : "#333";
  const linkColor = dark ? BRAND.blue : "#00C9B1";
  const ctaBg = dark ? BRAND.blue : "#0A1628";
  const ctaColor = "#ffffff";
  const strikeFg = dark ? "#666" : "#999";

  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, `<s style="color:${strikeFg}">$1</s>`)
    .replace(/^#{1,2} (.+)$/gm, `<h2 style="font-family:${BRAND.font};font-size:24px;font-weight:700;margin:24px 0 10px;color:${fg};line-height:1.25;letter-spacing:-0.3px">$1</h2>`)
    .replace(/^#{3,6} (.+)$/gm, `<h3 style="font-family:${BRAND.font};font-size:17px;font-weight:600;margin:18px 0 6px;color:${fg};line-height:1.3">$1</h3>`)
    .replace(/^[-*] (.+)$/gm, `<li style="margin:6px 0;font-family:${BRAND.font};font-size:15px;color:${bodyColor};line-height:1.7">$1</li>`)
    .replace(/(<li[^>]*>.*<\/li>)/gs, `<ul style="padding-left:20px;margin:14px 0">$1</ul>`)
    .replace(/→ (.+)/g, `<a href="#" style="display:inline-block;background:${ctaBg};color:${ctaColor};padding:12px 28px;border-radius:${dark ? '8px' : '6px'};text-decoration:none;font-family:${BRAND.font};font-size:14px;font-weight:600;margin:12px 0;letter-spacing:0.3px">→ $1</a>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" style="color:${linkColor};text-decoration:underline">$1</a>`)
    .replace(/\n\n/g, `</p><p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BRAND.font};font-size:15px">`)
    .replace(/^(?!<[huap])/, `<p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BRAND.font};font-size:15px">`)
    .replace(/(?<![>])$/, "</p>");
}

function formatPrice(price: string) {
  return `€${parseFloat(price).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}

/* ─── CLASSIC template (light, original) ─── */
function buildClassicProductCards(products: Product[]): string {
  if (!products || products.length === 0) return "";
  const cards = products.map((p) => {
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.title}" style="display:block;width:100%;border-radius:10px 10px 0 0" />`
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
          <p style="font-family:${BRAND.font};font-size:13px;font-weight:600;margin:0 0 4px;color:#0A1628;line-height:1.3">${p.title}</p>
          <p style="margin:0 0 10px">${compareHtml}<span style="font-family:${BRAND.font};font-size:13px;font-weight:700;color:${priceColor}">${formatPrice(p.price)}</span></p>
          <a href="${p.url}" target="_blank" style="display:block;background:#0A1628;color:#fff;text-align:center;padding:8px 0;border-radius:6px;font-family:${BRAND.font};font-size:12px;font-weight:600;text-decoration:none">${ctaLabel}</a>
        </td></tr>
      </table>
    </td>`;
  });
  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    rows += `<tr>${cards[i]}${cards[i + 1] || "<td></td>"}</tr>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">${rows}</table>`;
}

function buildClassicHtml(body: string, heroUrl?: string | null, products: Product[] = []): string {
  const bodyHtml = renderMarkdown(body, false);
  const productCards = buildClassicProductCards(products);
  const heroHtml = heroUrl
    ? `<tr><td><img src="${heroUrl}" alt="Hero" style="display:block;width:100%;max-height:320px;object-fit:cover" /></td></tr>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;overflow:hidden">
<tr><td style="background:#0A1628;padding:16px 24px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:#ffffff;font-family:${BRAND.font};font-weight:700;font-size:18px;letter-spacing:-0.5px">easysea®</td>
<td align="right" style="font-family:${BRAND.font};font-size:11px;font-weight:500"><a href="https://www.easysea.org" style="color:#00C9B1;text-decoration:none">easysea.org</a></td>
</tr></table>
</td></tr>
${heroHtml}
<tr><td style="padding:24px 32px;font-family:${BRAND.font}">${bodyHtml}${productCards}</td></tr>
<tr><td style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
<p style="font-family:${BRAND.font};font-size:11px;color:#9ca3af;margin:0">easysea® · Via dell'innovazione · Italia</p>
<p style="font-family:${BRAND.font};font-size:11px;color:#9ca3af;margin:4px 0 0"><a href="#" style="color:#9ca3af;text-decoration:underline">Disiscriviti</a> · <a href="https://www.easysea.org" style="color:#00C9B1;text-decoration:none">easysea.org</a></p>
</td></tr>
</table>
</td></tr></table>`;
}

/* ─── BRANDED template (dark, matching easysea.org) ─── */
function buildBrandedProductCards(products: Product[]): string {
  if (!products || products.length === 0) return "";
  const cards = products.map((p) => {
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.title}" style="display:block;width:100%;border-radius:12px 12px 0 0" />`
      : "";
    const compareHtml = p.compare_at_price
      ? `<span style="font-size:12px;color:#666;text-decoration:line-through;margin-right:6px">${formatPrice(p.compare_at_price)}</span>`
      : "";
    const priceColor = p.compare_at_price ? "#ef4444" : BRAND.white;
    const ctaLabel = p.in_stock ? "Shop now →" : "Discover →";
    return `<td style="width:50%;vertical-align:top;padding:8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;overflow:hidden;background:${BRAND.cardBg}">
        <tr><td>${imgHtml}</td></tr>
        <tr><td style="padding:14px 16px">
          <p style="font-family:${BRAND.font};font-size:14px;font-weight:600;margin:0 0 6px;color:${BRAND.white};line-height:1.3;letter-spacing:-0.2px">${p.title}</p>
          <p style="margin:0 0 12px">${compareHtml}<span style="font-family:${BRAND.font};font-size:14px;font-weight:700;color:${priceColor}">${formatPrice(p.price)}</span></p>
          <a href="${p.url}" target="_blank" style="display:block;background:${BRAND.blue};color:#fff;text-align:center;padding:10px 0;border-radius:8px;font-family:${BRAND.font};font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.2px">${ctaLabel}</a>
        </td></tr>
      </table>
    </td>`;
  });
  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    rows += `<tr>${cards[i]}${cards[i + 1] || "<td></td>"}</tr>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">${rows}</table>`;
}

function buildBrandedHtml(body: string, heroUrl?: string | null, products: Product[] = []): string {
  const bodyHtml = renderMarkdown(body, true);
  const productCards = buildBrandedProductCards(products);
  const heroHtml = heroUrl
    ? `<tr><td><img src="${heroUrl}" alt="Hero" style="display:block;width:100%;max-height:360px;object-fit:cover" /></td></tr>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.black}">
<tr><td align="center" style="padding:20px 0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.darkBg};overflow:hidden;border-radius:16px">

<!-- Header -->
<tr><td style="padding:20px 32px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:${BRAND.white};font-family:${BRAND.font};font-weight:800;font-size:20px;letter-spacing:-1px">easysea<span style="font-weight:400;font-size:14px;vertical-align:super;color:${BRAND.gray}">®</span></td>
<td align="right"><a href="https://www.easysea.org" style="font-family:${BRAND.font};font-size:12px;font-weight:500;color:${BRAND.blue};text-decoration:none;letter-spacing:0.3px">easysea.org →</a></td>
</tr></table>
</td></tr>

<!-- Thin blue accent line -->
<tr><td style="padding:0 32px"><div style="height:2px;background:linear-gradient(90deg,${BRAND.blue},transparent);border-radius:2px"></div></td></tr>

${heroHtml}

<!-- Body -->
<tr><td style="padding:28px 32px 16px;font-family:${BRAND.font}">
${bodyHtml}
${productCards}
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px 24px;border-top:1px solid #222;text-align:center">
<p style="font-family:${BRAND.font};font-size:11px;color:#555;margin:0;letter-spacing:0.5px">EASYSEA® · Beautiful and innovative nautical accessories</p>
<p style="font-family:${BRAND.font};font-size:11px;color:#444;margin:8px 0 0">
<a href="#" style="color:#555;text-decoration:underline">Unsubscribe</a>
<span style="color:#333;margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${BRAND.blue};text-decoration:none;font-weight:500">Visit easysea.org</a>
</p>
</td></tr>

</table>
</td></tr></table>`;
}

/* ─── Component ─── */
export default function EmailPreview({
  subjectLine,
  previewText,
  bodyMarkdown,
  whatsappCopy,
  heroImageUrl,
  products = [],
  language,
  branded: brandedProp,
  onBrandedChange,
}: EmailPreviewProps) {
  const [brandedInternal, setBrandedInternal] = useState(false);
  const branded = brandedProp !== undefined ? brandedProp : brandedInternal;
  const setBranded = (v: boolean) => {
    if (onBrandedChange) onBrandedChange(v);
    else setBrandedInternal(v);
  };

  const emailHtml = bodyMarkdown
    ? branded
      ? buildBrandedHtml(bodyMarkdown, heroImageUrl, products)
      : buildClassicHtml(bodyMarkdown, heroImageUrl, products)
    : "";

  return (
    <div className="space-y-6">
      {/* Email Preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anteprima Email
          </span>
          {language && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">{language.toUpperCase()}</span>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant={branded ? "default" : "outline"}
              onClick={() => setBranded(!branded)}
              className="h-7 text-xs gap-1.5"
            >
              {branded ? (
                <>
                  <LayoutTemplate className="h-3 w-3" />
                  Classico
                </>
              ) : (
                <>
                  <Paintbrush className="h-3 w-3" />
                  Stile easysea®
                </>
              )}
            </Button>
          </div>
        </div>

        <div className={`border rounded-xl overflow-hidden shadow-sm ${branded ? "bg-black" : "bg-white"}`}>
          {/* Email client chrome */}
          <div className={`border-b px-4 py-2 space-y-1 ${branded ? "bg-zinc-900 border-zinc-800" : "bg-gray-100"}`}>
            <div className="flex items-start gap-2">
              <span className={`text-xs w-16 shrink-0 pt-0.5 ${branded ? "text-zinc-500" : "text-gray-500"}`}>Subject</span>
              <span className={`text-sm font-semibold leading-tight ${branded ? "text-white" : "text-gray-900"}`}>{subjectLine || "—"}</span>
            </div>
            {previewText && (
              <div className="flex items-start gap-2">
                <span className={`text-xs w-16 shrink-0 pt-0.5 ${branded ? "text-zinc-500" : "text-gray-500"}`}>Preview</span>
                <span className={`text-xs italic leading-tight ${branded ? "text-zinc-400" : "text-gray-500"}`}>{previewText}</span>
              </div>
            )}
          </div>

          {emailHtml ? (
            <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
          ) : (
            <div style={{ padding: "24px 32px" }}>
              <p style={{ color: "#999", fontStyle: "italic", fontFamily: BRAND.font }}>
                Il copy apparirà qui dopo la generazione…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Preview */}
      {whatsappCopy && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
            Anteprima WhatsApp
          </span>
          <div className="bg-[#e5ddd5] rounded-xl p-4">
            <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-xs shadow-sm">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
                {whatsappCopy}
              </pre>
              <p className="text-xs text-gray-400 text-right mt-1">09:41 ✓✓</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
