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
}

function renderMarkdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, '<s style="color:#999">$1</s>')
    .replace(/^#{1,2} (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;margin:20px 0 8px;color:#0A1628">$1</h2>')
    .replace(/^#{3,6} (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 6px;color:#0A1628">$1</h3>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="padding-left:20px;margin:12px 0">$1</ul>')
    .replace(/→ (.+)/g, '<a href="#" style="display:inline-block;background:#0A1628;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">→ $1</a>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" style="color:#00C9B1;text-decoration:underline">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin:12px 0;line-height:1.6;color:#333">')
    .replace(/^(?!<[h|u|a|p])/, '<p style="margin:12px 0;line-height:1.6;color:#333">')
    .replace(/(?<![>])$/, "</p>");
}

function formatPrice(price: string) {
  return `€${parseFloat(price).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}

export default function EmailPreview({
  subjectLine,
  previewText,
  bodyMarkdown,
  whatsappCopy,
  heroImageUrl,
  products = [],
  language,
}: EmailPreviewProps) {
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
        </div>

        <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
          {/* Email client chrome */}
          <div className="bg-gray-100 border-b px-4 py-2 space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-16 shrink-0 pt-0.5">Subject</span>
              <span className="text-sm font-semibold text-gray-900 leading-tight">{subjectLine || "—"}</span>
            </div>
            {previewText && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0 pt-0.5">Preview</span>
                <span className="text-xs text-gray-500 italic leading-tight">{previewText}</span>
              </div>
            )}
          </div>

          {/* Email body */}
          <div className="mx-auto" style={{ maxWidth: 600, fontFamily: "'Inter', sans-serif" }}>
            {/* Header bar */}
            <div
              style={{
                background: "#0A1628",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
                easysea®
              </span>
              <span style={{ color: "#00C9B1", fontSize: 11, fontWeight: 500 }}>
                easysea.org
              </span>
            </div>

            {/* Hero image */}
            {heroImageUrl && (
              <img
                src={heroImageUrl}
                alt="Hero"
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
              />
            )}

            {/* Body */}
            <div style={{ padding: "24px 32px" }}>
              {bodyMarkdown ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMarkdown) }} />
              ) : (
                <p style={{ color: "#999", fontStyle: "italic" }}>Il copy apparirà qui dopo la generazione…</p>
              )}

              {/* Product cards */}
              {products.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: products.length === 1 ? "1fr" : "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {products.map((product) => (
                      <div
                        key={product.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                          />
                        )}
                        <div style={{ padding: "12px" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px", color: "#0A1628", lineHeight: 1.3 }}>
                            {product.title}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            {product.compare_at_price && (
                              <span style={{ fontSize: 12, color: "#999", textDecoration: "line-through" }}>
                                {formatPrice(product.compare_at_price)}
                              </span>
                            )}
                            <span style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: product.compare_at_price ? "#dc2626" : "#0A1628",
                            }}>
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "block",
                              background: "#0A1628",
                              color: "#fff",
                              textAlign: "center",
                              padding: "8px 0",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            {product.in_stock ? "Ordina ora →" : "Scopri →"}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                background: "#f3f4f6",
                padding: "16px 32px",
                borderTop: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                easysea® · Via dell'innovazione · Italia
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                <a href="#" style={{ color: "#9ca3af" }}>Disiscriviti</a>
                {" · "}
                <a href="https://www.easysea.org" style={{ color: "#00C9B1" }}>easysea.org</a>
              </p>
            </div>
          </div>
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
