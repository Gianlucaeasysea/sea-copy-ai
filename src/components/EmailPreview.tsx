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

/* ─── Brand tokens — easysea® Brand Book Marzo 2026 ─── */
const BRAND = {
  black: "#040603",
  white: "#FFFFFF",
  blue: "#0047BA",
  // neutrals (allowed shades of black/white)
  gray900: "#0a0a0a",
  gray700: "#2a2a2a",
  gray500: "#6b6b6b",
  gray300: "#cfcfcf",
  gray100: "#f2f2f2",
  // Headline font — Druk Wide alternative (free, wide heavy display)
  headFont: "'Big Shoulders Display', Impact, 'Arial Black', sans-serif",
  // Body — Montserrat as per brand book
  bodyFont: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  // Product/technical — uppercase Montserrat tracked (Manifold Extd CF alt.)
  techFont: "'Barlow Condensed', 'Montserrat', Arial, sans-serif",
};

/* ─── Shared markdown renderer ─── */
function renderMarkdown(md: string, dark: boolean): string {
  const fg = dark ? BRAND.white : BRAND.black;
  const bodyColor = dark ? BRAND.gray300 : BRAND.gray700;
  const linkColor = BRAND.blue;
  const ctaBg = BRAND.blue;
  const ctaColor = BRAND.white;
  const strikeFg = dark ? BRAND.gray500 : BRAND.gray500;

  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, `<s style="color:${strikeFg}">$1</s>`)
    .replace(/^#{1,2} (.+)$/gm, `<h2 style="font-family:${BRAND.headFont};font-size:32px;font-weight:800;margin:28px 0 14px;color:${fg};line-height:1.05;letter-spacing:-0.5px;text-transform:uppercase">$1</h2>`)
    .replace(/^#{3,6} (.+)$/gm, `<h3 style="font-family:${BRAND.techFont};font-size:14px;font-weight:600;margin:20px 0 8px;color:${fg};line-height:1.2;text-transform:uppercase;letter-spacing:1.5px">$1</h3>`)
    .replace(/^[-*] (.+)$/gm, `<li style="margin:6px 0;font-family:${BRAND.bodyFont};font-size:15px;color:${bodyColor};line-height:1.7">$1</li>`)
    .replace(/(<li[^>]*>.*<\/li>)/gs, `<ul style="padding-left:20px;margin:14px 0">$1</ul>`)
    .replace(/→ (.+)/g, `<a href="#" style="display:inline-block;background:${ctaBg};color:${ctaColor};padding:14px 32px;border-radius:0;text-decoration:none;font-family:${BRAND.techFont};font-size:13px;font-weight:600;margin:16px 0;letter-spacing:2px;text-transform:uppercase">$1</a>`)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" style="display:block;max-width:100%;margin:20px 0;border-radius:0" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" style="color:${linkColor};text-decoration:underline">$1</a>`)
    .replace(/\n\n/g, `</p><p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BRAND.bodyFont};font-size:15px">`)
    .replace(/^(?!<[huap])/, `<p style="margin:14px 0;line-height:1.7;color:${bodyColor};font-family:${BRAND.bodyFont};font-size:15px">`)
    .replace(/(?<![>])$/, "</p>");
}

function formatPrice(price: string) {
  return `€${parseFloat(price).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}

/* ─── Product card builder (works for light + dark) ─── */
function buildProductCards(products: Product[], dark: boolean): string {
  if (!products || products.length === 0) return "";
  const cardBg = dark ? BRAND.gray900 : BRAND.white;
  const cardBorder = dark ? "1px solid #1a1a1a" : `1px solid ${BRAND.black}`;
  const titleColor = dark ? BRAND.white : BRAND.black;
  const compareColor = dark ? BRAND.gray500 : BRAND.gray500;
  const ctaLabelStock = "Ordina ora";
  const ctaLabelOos = "Scopri";

  const cards = products.map((p) => {
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.title}" style="display:block;width:100%" />`
      : "";
    const compareHtml = p.compare_at_price
      ? `<span style="font-size:12px;color:${compareColor};text-decoration:line-through;margin-right:8px;font-family:${BRAND.bodyFont}">${formatPrice(p.compare_at_price)}</span>`
      : "";
    const priceColor = p.compare_at_price ? BRAND.blue : titleColor;
    const ctaLabel = p.in_stock ? ctaLabelStock : ctaLabelOos;
    return `<td style="width:50%;vertical-align:top;padding:8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:${cardBorder};background:${cardBg}">
        <tr><td>${imgHtml}</td></tr>
        <tr><td style="padding:16px">
          <p style="font-family:${BRAND.techFont};font-size:13px;font-weight:600;margin:0 0 8px;color:${titleColor};line-height:1.25;text-transform:uppercase;letter-spacing:1px">${p.title}</p>
          <p style="margin:0 0 14px">${compareHtml}<span style="font-family:${BRAND.bodyFont};font-size:15px;font-weight:700;color:${priceColor}">${formatPrice(p.price)}</span></p>
          <a href="${p.url}" target="_blank" style="display:block;background:${BRAND.blue};color:${BRAND.white};text-align:center;padding:12px 0;border-radius:0;font-family:${BRAND.techFont};font-size:12px;font-weight:600;text-decoration:none;letter-spacing:2px;text-transform:uppercase">${ctaLabel}</a>
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

/* ─── CLASSIC template (light: white background, black text) ─── */
function buildClassicHtml(body: string, heroUrl?: string | null, products: Product[] = []): string {
  const bodyHtml = renderMarkdown(body, false);
  const productCards = buildProductCards(products, false);
  const heroHtml = heroUrl
    ? `<tr><td><img src="${heroUrl}" alt="" style="display:block;width:100%;max-height:380px;object-fit:cover" /></td></tr>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.white}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.white}">

<!-- Header: black bar, lowercase logo -->
<tr><td style="background:${BRAND.black};padding:22px 32px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:${BRAND.white};font-family:${BRAND.headFont};font-weight:800;font-size:22px;letter-spacing:-0.5px;text-transform:lowercase">easysea<span style="font-size:11px;vertical-align:super;font-weight:400">®</span></td>
<td align="right" style="font-family:${BRAND.techFont};font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase"><a href="https://www.easysea.org" style="color:${BRAND.white};text-decoration:none">easysea.org</a></td>
</tr></table>
</td></tr>

${heroHtml}

<tr><td style="padding:32px 32px 16px;font-family:${BRAND.bodyFont}">${bodyHtml}${productCards}</td></tr>

<!-- Footer -->
<tr><td style="background:${BRAND.black};padding:24px 32px;text-align:center">
<p style="font-family:${BRAND.techFont};font-size:10px;color:${BRAND.white};margin:0;letter-spacing:2px;text-transform:uppercase">EASYSEA® · NAUTICAL ACCESSORIES · ITALY</p>
<p style="font-family:${BRAND.bodyFont};font-size:11px;color:${BRAND.gray300};margin:10px 0 0">
Via Per Curnasco 52 · Bergamo 24127 · Italia
</p>
<p style="font-family:${BRAND.bodyFont};font-size:11px;margin:8px 0 0">
<a href="#" style="color:${BRAND.gray300};text-decoration:underline">Disiscriviti</a>
<span style="color:${BRAND.gray500};margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${BRAND.white};text-decoration:none;font-weight:500">easysea.org</a>
</p>
</td></tr>

</table>
</td></tr></table>`;
}

/* ─── BRANDED template (dark: black background, blue accent) ─── */
function buildBrandedHtml(body: string, heroUrl?: string | null, products: Product[] = []): string {
  const bodyHtml = renderMarkdown(body, true);
  const productCards = buildProductCards(products, true);
  const heroHtml = heroUrl
    ? `<tr><td><img src="${heroUrl}" alt="" style="display:block;width:100%;max-height:420px;object-fit:cover" /></td></tr>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.black}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.black}">

<!-- Header -->
<tr><td style="padding:28px 32px 20px">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="color:${BRAND.white};font-family:${BRAND.headFont};font-weight:800;font-size:24px;letter-spacing:-0.5px;text-transform:lowercase">easysea<span style="font-size:12px;vertical-align:super;font-weight:400;color:${BRAND.gray300}">®</span></td>
<td align="right"><a href="https://www.easysea.org" style="font-family:${BRAND.techFont};font-size:11px;font-weight:600;color:${BRAND.white};text-decoration:none;letter-spacing:2px;text-transform:uppercase">easysea.org</a></td>
</tr></table>
</td></tr>

${heroHtml}

<!-- Body -->
<tr><td style="padding:36px 32px 16px;font-family:${BRAND.bodyFont}">
${bodyHtml}
${productCards}
</td></tr>

<!-- Footer: minimal, technical -->
<tr><td style="padding:32px 32px 28px;border-top:1px solid #1a1a1a;text-align:center">
<p style="font-family:${BRAND.techFont};font-size:10px;color:${BRAND.gray300};margin:0;letter-spacing:2.5px;text-transform:uppercase">EASYSEA® — DESIGN AS FUNCTION</p>
<p style="font-family:${BRAND.bodyFont};font-size:11px;color:${BRAND.gray500};margin:12px 0 0">
Via Per Curnasco 52 · Bergamo 24127 · Italia
</p>
<p style="font-family:${BRAND.bodyFont};font-size:11px;margin:10px 0 0">
<a href="#" style="color:${BRAND.gray500};text-decoration:underline">Unsubscribe</a>
<span style="color:${BRAND.gray700};margin:0 8px">·</span>
<a href="https://www.easysea.org" style="color:${BRAND.blue};text-decoration:none;font-weight:600">easysea.org</a>
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
                  Light
                </>
              ) : (
                <>
                  <Paintbrush className="h-3 w-3" />
                  Dark easysea®
                </>
              )}
            </Button>
          </div>
        </div>

        <div className={`border rounded-xl overflow-hidden shadow-sm ${branded ? "bg-black" : "bg-white"}`}>
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
              <p style={{ color: "#999", fontStyle: "italic", fontFamily: BRAND.bodyFont }}>
                Il copy apparirà qui dopo la generazione…
              </p>
            </div>
          )}
        </div>
      </div>

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
