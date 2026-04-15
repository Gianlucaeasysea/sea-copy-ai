import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ExternalLink, Palette } from "lucide-react";

interface CanvaBriefProps {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  subjectLine: string;
  previewText: string;
  bodyMarkdown: string;
  whatsappCopy: string;
  products: any[];
  heroImageUrl?: string;
}

interface BriefSection {
  key: string;
  label: string;
  content: string;
  hint: string;
}

function markdownToText(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^#{1,6} (.+)$/gm, "$1")
    .replace(/^[-*] (.+)$/gm, "• $1")
    .replace(/→ \[([^\]]+)\]\([^\)]+\)/g, "→ $1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .trim();
}

export default function CanvaBrief({
  open, onClose,
  campaignName, subjectLine, previewText, bodyMarkdown, whatsappCopy,
  products, heroImageUrl,
}: CanvaBriefProps) {

  const [copied, setCopied] = useState<string | null>(null);

  const copySection = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copiato!");
    setTimeout(() => setCopied(null), 2000);
  };

  const plainBody = markdownToText(bodyMarkdown);
  const lines = plainBody.split(/\n\n+/).filter(Boolean);
  const introText   = lines[0] || "";
  const bodyText    = lines.slice(1, -1).join("\n\n") || lines.slice(1).join("\n\n");
  const ctaText     = lines[lines.length - 1] !== introText ? lines[lines.length - 1] : "";

  const sections: BriefSection[] = [
    {
      key: "subject",
      label: "SUBJECT / HEADLINE",
      content: subjectLine,
      hint: "Titolo principale del design Canva",
    },
    {
      key: "preview",
      label: "SOTTOTITOLO / PREVIEW",
      content: previewText,
      hint: "Testo secondario o tagline",
    },
    ...(heroImageUrl ? [{
      key: "hero",
      label: "HERO IMAGE URL",
      content: heroImageUrl,
      hint: "Immagine principale da inserire in Canva",
    }] : []),
    {
      key: "intro",
      label: "TESTO APERTURA",
      content: introText,
      hint: "Primo paragrafo — opening hook",
    },
    ...(bodyText ? [{
      key: "body",
      label: "CORPO MAIL",
      content: bodyText,
      hint: "Contenuto principale — copia nella text box centrale",
    }] : []),
    ...(ctaText && ctaText !== introText ? [{
      key: "cta",
      label: "CALL TO ACTION",
      content: ctaText.replace(/^→ /, ""),
      hint: "Testo del bottone CTA",
    }] : []),
    ...(products.length > 0 ? [{
      key: "products",
      label: `PRODOTTI (${products.length})`,
      content: products.map((p: any, i: number) =>
        `${i + 1}. ${p.title}\n   Prezzo: €${parseFloat(p.price).toFixed(2)}${p.compare_at_price ? ` (era €${parseFloat(p.compare_at_price).toFixed(2)})` : ""}\n   URL: ${p.url}\n   Immagine: ${p.image_url || "—"}`
      ).join("\n\n"),
      hint: "Dati prodotti da inserire nelle product card Canva",
    }] : []),
    ...(whatsappCopy ? [{
      key: "whatsapp",
      label: "WHATSAPP VERSION",
      content: whatsappCopy,
      hint: "Testo per story/messaggio Canva social",
    }] : []),
  ];

  const copyAll = () => {
    const all = sections.map((s) => `=== ${s.label} ===\n${s.content}`).join("\n\n");
    navigator.clipboard.writeText(all);
    toast.success("Brief completo copiato!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-500" />
            Brief Canva — {campaignName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Copia le sezioni nel tuo template Canva. Incolla le immagini prodotto direttamente dal loro URL.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sections.map((section) => (
            <div key={section.key} className="border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest text-muted-foreground">{section.label}</p>
                  <p className="text-xs text-muted-foreground/60">{section.hint}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => copySection(section.key, section.content)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {copied === section.key ? "✓" : "Copia"}
                </Button>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/40 p-2.5 rounded-md text-foreground leading-relaxed max-h-40 overflow-y-auto">
                {section.content || "(vuoto)"}
              </pre>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={copyAll}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copia tutto
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://www.canva.com/create/emails/", "_blank")}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Apri Canva
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Chiudi</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
