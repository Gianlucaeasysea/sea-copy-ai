import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Check, Save, Send, Pencil, Trash2, Copy, ShoppingBag, X, ImageIcon, FileText, Moon, Sun, LayoutTemplate, Palette } from "lucide-react";
import CanvaBrief from "@/components/CanvaBrief";
import EmailPreview from "@/components/EmailPreview";
import ProductPicker, { ShopifyProduct, ShopifyCollection } from "@/components/ProductPicker";
import ProductElementPicker, { ProductElements } from "@/components/ProductElementPicker";
import HeroImageCreator from "@/components/HeroImageCreator";
import ImageInserter from "@/components/ImageInserter";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const categories = ["Terminology", "Tone", "CTA", "Product Naming", "Structure", "Other"];

interface ParsedEmail {
  index: number;
  label: string;
  subject_line: string;
  preview_text: string;
  body_markdown: string;
  whatsapp_copy: string;
}

function parseSequenceText(fullText: string): ParsedEmail[] {
  // Try to split on === EMAIL N: Label === delimiter
  const parts = fullText.split(/===\s*EMAIL\s+(\d+)[:\s—–\-]+([^=\n]+?)\s*===/i);

  if (parts.length < 4) {
    // Single email — parse normally
    return [{
      index: 1,
      label: "Email",
      subject_line: (fullText.match(/##\s*Subject Line\s*\n([^\n]+)/i)?.[1] || "").trim(),
      preview_text:  (fullText.match(/##\s*Preview Text\s*\n([^\n]+)/i)?.[1] || "").trim(),
      body_markdown: (fullText.match(/##\s*Email Body\s*\n([\s\S]+?)(?=##\s*WhatsApp|$)/i)?.[1] || "").trim(),
      whatsapp_copy: (fullText.match(/##\s*WhatsApp Version\s*\n([\s\S]+?)(?===\s*EMAIL|\s*$)/i)?.[1] || "").trim(),
    }];
  }

  // Multi-email: parts = [before, index1, label1, content1, index2, label2, content2, ...]
  const results: ParsedEmail[] = [];
  for (let i = 1; i < parts.length; i += 3) {
    const content = parts[i + 2] || "";
    results.push({
      index:        parseInt(parts[i]) || results.length + 1,
      label:        (parts[i + 1] || `Email ${i}`).trim(),
      subject_line: (content.match(/##\s*Subject Line\s*\n([^\n]+)/i)?.[1] || "").trim(),
      preview_text: (content.match(/##\s*Preview Text\s*\n([^\n]+)/i)?.[1] || "").trim(),
      body_markdown:(content.match(/##\s*Email Body\s*\n([\s\S]+?)(?=##\s*WhatsApp|$)/i)?.[1] || "").trim(),
      whatsapp_copy:(content.match(/##\s*WhatsApp Version\s*\n([\s\S]+?)$/i)?.[1] || "").trim(),
    });
  }
  return results.length > 0 ? results : [{
    index: 1, label: "Email",
    subject_line: "", preview_text: "", body_markdown: fullText, whatsapp_copy: "",
  }];
}

export default function CampaignEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [subjectLine, setSubjectLine] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [aiBody, setAiBody] = useState("");
  const [editBody, setEditBody] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pushingKlaviyo, setPushingKlaviyo] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionCategory, setCorrectionCategory] = useState("Terminology");
  const [correctionNote, setCorrectionNote] = useState("");
  const [selectedOld, setSelectedOld] = useState("");
  const [selectedNew, setSelectedNew] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [refineNotes, setRefineNotes] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateLanguage, setDuplicateLanguage] = useState("it");
  const [duplicating, setDuplicating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Shopify product picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorProducts, setEditorProducts] = useState<ShopifyProduct[]>([]);
  const [editorCollection, setEditorCollection] = useState<ShopifyCollection | null>(null);
  const [productElements, setProductElements] = useState<Record<string, ProductElements>>({});
  const [elementPickerProduct, setElementPickerProduct] = useState<ShopifyProduct | null>(null);
  const [heroCreatorOpen, setHeroCreatorOpen] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"html_dark" | "html_light" | "plaintext" | "template" | "canva">("html_dark");
  const [canvaOpen, setCanvaOpen] = useState(false);
  const [imageInserterOpen, setImageInserterOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Sequence state
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [activeEmailIndex, setActiveEmailIndex] = useState(0);
  const [isSequence, setIsSequence] = useState(false);

  const needsAutoGenerate = useRef(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("id", id).single();
      if (data) {
        setCampaign(data);
        setSubjectLine(data.subject_line || "");
        setPreviewText(data.preview_text || "");
        setAiBody(data.body_markdown || "");
        setEditBody(data.body_markdown || "");
        setWhatsapp(data.whatsapp_copy || "");

        // Restore sequence state if available
        if ((data as any).is_sequence && (data as any).sequence_emails) {
          const emails = (data as any).sequence_emails as ParsedEmail[];
          setParsedEmails(emails);
          setIsSequence(true);
          setActiveEmailIndex(0);
        }

        // Restore products from campaign
        if (data.products_data && Array.isArray(data.products_data)) {
          setEditorProducts(data.products_data as any);
        }

        // Auto-generate if campaign has no body yet
        if (!data.body_markdown) {
          needsAutoGenerate.current = true;
        }
      }
    };
    load();
  }, [id]);

  // Trigger auto-generation after campaign is loaded
  useEffect(() => {
    if (campaign && needsAutoGenerate.current) {
      needsAutoGenerate.current = false;
      generate();
    }
  }, [campaign]);

  const handleEmailTabChange = (index: number) => {
    setActiveEmailIndex(index);
    const email = parsedEmails[index];
    if (!email) return;
    setSubjectLine(email.subject_line);
    setPreviewText(email.preview_text);
    setAiBody(email.body_markdown);
    setEditBody(email.body_markdown);
    setWhatsapp(email.whatsapp_copy);
  };

  const saveToLibrary = async (
    subj: string,
    preview: string,
    body: string,
    wa: string,
    modelUsed: string,
    emailLabel?: string
  ) => {
    if (!campaign) return;
    await supabase.from("generated_emails").insert({
      campaign_id: campaign.id,
      campaign_name: emailLabel ? `${campaign.name} — ${emailLabel}` : campaign.name,
      subject_line: subj,
      preview_text: preview,
      body_markdown: body,
      whatsapp_copy: wa,
      language: campaign.language,
      framework: campaign.framework,
      model_used: modelUsed,
      products_data: campaign.products_data ?? null,
      hero_image_url: campaign.hero_image_url ?? null,
    } as any);
  };

  const generate = async (extraNotes?: string) => {
    setGenerating(true);
    setAiBody("");
    setEditBody("");
    setWhatsapp("");
    setSubjectLine("");
    setParsedEmails([]);
    setIsSequence(false);
    setActiveEmailIndex(0);

    // If extra notes provided, append to campaign context_notes before generating
    if (extraNotes && campaign) {
      const existing = campaign.context_notes || "";
      const merged = existing ? `${existing}\n\nNote aggiuntive: ${extraNotes}` : extraNotes;
      await supabase.from("campaigns").update({ context_notes: merged }).eq("id", campaign.id);
      setCampaign((c: any) => ({ ...c, context_notes: merged }));
    }

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ campaign_id: id }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const modelUsed = resp.headers.get("X-Model-Used") || "gemini";

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "") continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiBody(fullText);
              setEditBody(fullText);
            }
          } catch {}
        }
      }

      // Parse sequence or single email
      const emails = parseSequenceText(fullText);
      const isSeq = emails.length > 1;

      setParsedEmails(emails);
      setIsSequence(isSeq);
      setActiveEmailIndex(0);

      // Set fields with first email
      setSubjectLine(emails[0].subject_line);
      setPreviewText(emails[0].preview_text);
      setAiBody(emails[0].body_markdown);
      setEditBody(emails[0].body_markdown);
      setWhatsapp(emails[0].whatsapp_copy);

      // Save each email to Library
      for (const email of emails) {
        await saveToLibrary(
          email.subject_line,
          email.preview_text,
          email.body_markdown,
          email.whatsapp_copy,
          modelUsed,
          isSeq ? email.label : undefined
        );
      }

      // Update campaign
      await supabase.from("campaigns").update({
        subject_line: emails[0].subject_line,
        preview_text: emails[0].preview_text,
        body_markdown: emails[0].body_markdown,
        whatsapp_copy: emails[0].whatsapp_copy,
        is_sequence: isSeq,
        sequence_emails: isSeq ? emails : null,
      } as any).eq("id", campaign.id);

    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Generation error");
    }
    setGenerating(false);
  };

  const save = async () => {
    if (!id) return;

    // If sequence, update the active email in parsedEmails too
    if (isSequence && parsedEmails.length > 0) {
      const updated = [...parsedEmails];
      updated[activeEmailIndex] = {
        ...updated[activeEmailIndex],
        subject_line: subjectLine,
        preview_text: previewText,
        body_markdown: editBody,
        whatsapp_copy: whatsapp,
      };
      setParsedEmails(updated);

      await supabase.from("campaigns").update({
        subject_line: subjectLine,
        preview_text: previewText,
        body_markdown: editBody,
        whatsapp_copy: whatsapp,
        sequence_emails: updated,
      } as any).eq("id", id);
    } else {
      await supabase.from("campaigns").update({
        subject_line: subjectLine,
        preview_text: previewText,
        body_markdown: editBody,
        whatsapp_copy: whatsapp,
      }).eq("id", id);
    }
    toast.success("Saved!");
  };

  const approve = async () => {
    if (!id) return;
    await supabase.from("campaigns").update({ status: "approved" }).eq("id", id);
    setCampaign((c: any) => ({ ...c, status: "approved" }));
    toast.success("Campaign approved!");
  };

  const handlePushToKlaviyo = async () => {
    if (!campaign) return;

    // Canva — apre brief senza chiamare Klaviyo
    if (outputFormat === "canva") {
      setCanvaOpen(true);
      return;
    }

    setPushingKlaviyo(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-to-klaviyo", {
        body: {
          campaign_id: campaign.id,
          output_format: outputFormat,
          branded_style: outputFormat === "html_dark",
        },
      });
      if (error) throw error;

      if (outputFormat === "template") {
        toast.success(
          <span>
            Template salvato in Klaviyo!{" "}
            {data?.klaviyo_url && (
              <a href={data.klaviyo_url} target="_blank" rel="noopener noreferrer" className="underline">
                Vedi template →
              </a>
            )}
          </span>
        );
      } else if (data?.klaviyo_url) {
        toast.success(
          <span>
            Pushato su Klaviyo!{" "}
            <a href={data.klaviyo_url} target="_blank" rel="noopener noreferrer" className="underline">
              Apri in Klaviyo →
            </a>
          </span>
        );
      } else {
        toast.success("Campaign creata su Klaviyo come draft");
      }
    } catch (e: any) {
      toast.error("Klaviyo push fallito: " + (e?.message || "errore sconosciuto"));
    } finally {
      setPushingKlaviyo(false);
    }
  };

  const handleMarkCorrection = () => {
    if (aiBody === editBody) {
      toast.info("No changes detected");
      return;
    }
    const oldLines = aiBody.split("\n");
    const newLines = editBody.split("\n");
    let oldDiff = "", newDiff = "";
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        oldDiff += (oldLines[i] || "") + "\n";
        newDiff += (newLines[i] || "") + "\n";
      }
    }
    setSelectedOld(oldDiff.trim());
    setSelectedNew(newDiff.trim());
    setShowCorrection(true);
  };

  const saveCorrection = async () => {
    await supabase.from("corrections").insert({
      campaign_id: id,
      original_text: selectedOld,
      corrected_text: selectedNew,
      category: correctionCategory.toLowerCase(),
      language: campaign?.language || "all",
      note: correctionNote || null,
    });
    toast.success("Correction saved — it will influence future generations!");
    setShowCorrection(false);
    setCorrectionNote("");
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    setDuplicating(true);
    try {
      // Include source text so generate-copy can translate instead of rewriting
      const sourceBody = editBody || campaign.body_markdown || "";
      const sourceSubject = subjectLine || campaign.subject_line || "";
      const sourcePreview = previewText || campaign.preview_text || "";
      const sourceWhatsapp = whatsapp || campaign.whatsapp_copy || "";

      const { data, error } = await supabase.from("campaigns").insert({
        name: `${campaign.name} (${duplicateLanguage.toUpperCase()})`,
        type: campaign.type,
        language: duplicateLanguage,
        framework: campaign.framework,
        subject_tone: campaign.subject_tone,
        context_notes: `[TRANSLATE FROM ${campaign.language.toUpperCase()}]\n---SOURCE_SUBJECT---\n${sourceSubject}\n---SOURCE_PREVIEW---\n${sourcePreview}\n---SOURCE_BODY---\n${sourceBody}\n---SOURCE_WHATSAPP---\n${sourceWhatsapp}\n---END_SOURCE---\n${campaign.context_notes || ""}`,
        shopify_product_ids: campaign.shopify_product_ids,
        products_data: campaign.products_data,
        hero_image_url: campaign.hero_image_url,
        collection_name: campaign.collection_name,
        notion_url: campaign.notion_url,
        status: "draft",
      }).select().single();
      if (error) throw error;
      toast.success(`Campagna duplicata in ${duplicateLanguage.toUpperCase()}!`);
      setShowDuplicate(false);
      navigate(`/campaign/${data.id}`);
    } catch (e: any) {
      toast.error("Errore nella duplicazione: " + (e?.message || "unknown"));
    } finally {
      setDuplicating(false);
    }
  };

  const handleProductsChange = async (products: ShopifyProduct[], collection: ShopifyCollection | null) => {
    setEditorProducts(products);
    setEditorCollection(collection);
    const productsData = products.length > 0
      ? products.map((p) => ({ ...p, elements: productElements[p.id] || null }))
      : null;
    await supabase.from("campaigns").update({
      products_data: productsData as any,
      collection_name: collection?.title || null,
      hero_image_url: campaign.hero_image_url || products[0]?.image_url || null,
    } as any).eq("id", id);
    setCampaign((c: any) => ({
      ...c,
      products_data: productsData,
      collection_name: collection?.title || null,
      hero_image_url: c.hero_image_url || products[0]?.image_url || null,
    }));
    toast.success("Prodotti aggiornati!");
  };

  const handleProductElementsConfirm = async (elements: ProductElements) => {
    const newElements = { ...productElements, [elements.product_id]: elements };
    setProductElements(newElements);
    // Update products_data with new elements
    const productsData = editorProducts.map((p) => ({ ...p, elements: newElements[p.id] || null }));
    await supabase.from("campaigns").update({ products_data: productsData as any } as any).eq("id", id);
    setCampaign((c: any) => ({ ...c, products_data: productsData }));
    toast.success("Dettagli prodotto aggiornati!");
  };

  if (!campaign) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Top bar */}
      <div className="border-b p-3 flex items-center gap-3 flex-wrap bg-background shrink-0">
        <div className="flex-1 min-w-[200px] space-y-1">
          <Label className="text-xs text-muted-foreground">Subject Line</Label>
          <Input value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex-1 min-w-[200px] space-y-1">
          <Label className="text-xs text-muted-foreground">Preview Text</Label>
          <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} className="h-8 text-sm font-mono text-xs" />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Button size="sm" variant="outline" onClick={() => generate()} disabled={generating}>
            <RefreshCw className={`mr-1 h-3 w-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : aiBody ? "Regenerate" : "Generate"}
          </Button>
          {aiBody && !generating && (
            <Button size="sm" variant="outline" onClick={() => setShowRefine(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="mr-1 h-3 w-3" />
              Scarta & Rifai
            </Button>
          )}
          {aiBody !== editBody && (
            <Button size="sm" variant="outline" onClick={handleMarkCorrection}>
              <Pencil className="mr-1 h-3 w-3" />
              Mark Correction
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={save}>
            <Save className="mr-1 h-3 w-3" /> Save
          </Button>
          <Button size="sm" onClick={approve}>
            <Check className="mr-1 h-3 w-3" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePushToKlaviyo}
            disabled={pushingKlaviyo || !subjectLine}
          >
            {outputFormat === "canva" ? (
              <Palette className="mr-1 h-3 w-3" />
            ) : (
              <Send className="mr-1 h-3 w-3" />
            )}
            {pushingKlaviyo
              ? "Pushing..."
              : outputFormat === "canva"
              ? "Brief Canva"
              : outputFormat === "template"
              ? "→ Salva template"
              : "→ Klaviyo"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setDuplicateLanguage(campaign.language === "it" ? "en" : "it"); setShowDuplicate(true); }}
          >
            <Copy className="mr-1 h-3 w-3" />
            Duplica
          </Button>
        </div>
        {/* Output format selector */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="text-xs text-muted-foreground font-medium">Formato:</span>
          {(
            [
              { value: "html_dark",  label: "HTML dark",   icon: Moon       },
              { value: "html_light", label: "HTML light",  icon: Sun        },
              { value: "plaintext",  label: "Plain text",  icon: FileText   },
              { value: "template",   label: "Template",    icon: LayoutTemplate },
              { value: "canva",      label: "Canva",       icon: Palette    },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setOutputFormat(value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                ${outputFormat === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sequence tab navigation — visible only for multi-email frameworks */}
      {isSequence && parsedEmails.length > 1 && (
        <div className="border-b bg-muted/30 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">
            Sequenza:
          </span>
          {parsedEmails.map((email, i) => (
            <button
              key={i}
              onClick={() => handleEmailTabChange(i)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap border
                ${activeEmailIndex === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border"}`}
            >
              {email.label || `Email ${email.index}`}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-2 shrink-0">
            {activeEmailIndex + 1} / {parsedEmails.length}
          </span>
        </div>
      )}

      {/* Product bar */}
      <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <ShoppingBag className="mr-1 h-3 w-3" />
          {editorProducts.length > 0
            ? `${editorProducts.length} prodotti`
            : "Aggiungi prodotti da Shopify"}
        </Button>
        {editorProducts.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 bg-background rounded-md px-2 py-1 border">
            {p.image_url && (
              <img src={p.image_url} alt={p.title} className="h-5 w-5 rounded object-cover" />
            )}
            <span className="text-xs max-w-[120px] truncate">{p.title}</span>
            <button
              onClick={() => setElementPickerProduct(p)}
              className="text-xs text-primary underline ml-0.5"
            >
              {productElements[p.id] ? "✓" : "dettagli"}
            </button>
            <button
              onClick={() => {
                const updated = editorProducts.filter((x) => x.id !== p.id);
                handleProductsChange(updated, editorCollection);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setHeroCreatorOpen(true)}>
          <ImageIcon className="mr-1 h-3 w-3" />
          {campaign.hero_image_url ? "Cambia hero" : "Crea hero image"}
        </Button>
        {campaign.hero_image_url && (
          <img src={campaign.hero_image_url} alt="Hero" className="h-7 rounded border" />
        )}
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editable */}
        <div className="flex-1 border-r overflow-auto p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">Editable</Badge>
            <Badge variant="outline" className="text-xs">{campaign.framework}</Badge>
            {isSequence && (
              <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                {parsedEmails.length} email
              </Badge>
            )}
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={() => setImageInserterOpen(true)}>
                <ImageIcon className="mr-1 h-3 w-3" /> Inserisci immagine
              </Button>
            </div>
          </div>
          <Textarea
            ref={editorRef}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="min-h-[400px] font-mono text-sm resize-none border-0 focus-visible:ring-0 p-0"
            placeholder="Generated copy will appear here for editing..."
          />
          {whatsapp && (
            <div className="mt-6 pt-4 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">WhatsApp Version</Label>
              <Textarea
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="font-mono text-sm min-h-[100px]"
              />
            </div>
          )}
        </div>

        {/* Right: Visual Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <EmailPreview
            subjectLine={subjectLine}
            previewText={previewText}
            bodyMarkdown={editBody}
            whatsappCopy={whatsapp}
            heroImageUrl={(campaign as any)?.hero_image_url}
            products={editorProducts.length > 0 ? editorProducts : ((campaign as any)?.products_data as any[] || [])}
            language={campaign?.language}
            branded={outputFormat === "html_dark"}
            onBrandedChange={(v) => setOutputFormat(v ? "html_dark" : "html_light")}
          />
        </div>
      </div>

      {/* Correction modal */}
      <Dialog open={showCorrection} onOpenChange={setShowCorrection}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark as Correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Original (AI)</Label>
                <div className="mt-1 p-3 rounded bg-destructive/5 border text-sm font-mono whitespace-pre-wrap max-h-[150px] overflow-auto">
                  {selectedOld}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Your Correction</Label>
                <div className="mt-1 p-3 rounded bg-primary/5 border text-sm font-mono whitespace-pre-wrap max-h-[150px] overflow-auto">
                  {selectedNew}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={correctionCategory} onValueChange={setCorrectionCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} placeholder="e.g. We always say 'navigare' not 'veleggiare'" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCorrection(false)}>Cancel</Button>
            <Button onClick={saveCorrection}>Save Correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refine & Regenerate modal */}
      <Dialog open={showRefine} onOpenChange={setShowRefine}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scarta e Rigenera</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La mail attuale verrà scartata. Aggiungi dettagli per guidare la prossima generazione:
            </p>
            <Textarea
              value={refineNotes}
              onChange={(e) => setRefineNotes(e.target.value)}
              placeholder="Es. Più focus sul prodotto X, tono più urgente, aggiungi scarcity, menziona la spedizione gratuita..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefine(false)}>Annulla</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRefine(false);
                generate(refineNotes || undefined);
                setRefineNotes("");
              }}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Scarta & Rigenera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Duplicate modal */}
      <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Duplica Campagna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Duplica questa campagna e genera il copy in un'altra lingua.
            </p>
            <div className="space-y-2">
              <Label>Lingua</Label>
              <Select value={duplicateLanguage} onValueChange={setDuplicateLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicate(false)}>Annulla</Button>
            <Button onClick={handleDuplicate} disabled={duplicating}>
              <Copy className="mr-1 h-3 w-3" />
              {duplicating ? "Duplicando..." : "Duplica & Genera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Product Picker modal */}
      <ProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedProducts={editorProducts}
        onSelect={handleProductsChange}
      />

      {/* Product Element Picker modal */}
      {elementPickerProduct && (
        <ProductElementPicker
          open={!!elementPickerProduct}
          onClose={() => setElementPickerProduct(null)}
          productId={elementPickerProduct.id}
          productTitle={elementPickerProduct.title}
          onConfirm={handleProductElementsConfirm}
        />
      )}

      {/* Hero Image Creator */}
      <HeroImageCreator
        open={heroCreatorOpen}
        onClose={() => setHeroCreatorOpen(false)}
        onImageReady={async (url) => {
          await supabase.from("campaigns").update({ hero_image_url: url } as any).eq("id", id);
          setCampaign((c: any) => ({ ...c, hero_image_url: url }));
        }}
      />

      {/* Image Inserter */}
      <ImageInserter
        open={imageInserterOpen}
        onClose={() => setImageInserterOpen(false)}
        onInsert={(md) => {
          const textarea = editorRef.current;
          if (textarea) {
            const pos = textarea.selectionStart || editBody.length;
            const newBody = editBody.slice(0, pos) + md + editBody.slice(pos);
            setEditBody(newBody);
          } else {
            setEditBody(editBody + md);
          }
        }}
      />
    </div>
  );
}
