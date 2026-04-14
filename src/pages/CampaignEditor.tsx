import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Check, Save, Send, Pencil } from "lucide-react";
import EmailPreview from "@/components/EmailPreview";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const categories = ["Terminology", "Tone", "CTA", "Product Naming", "Structure", "Other"];

export default function CampaignEditor() {
  const { id } = useParams<{ id: string }>();
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
  const abortRef = useRef<AbortController | null>(null);

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
      }
    };
    load();
  }, [id]);

  const saveToLibrary = async (
    subj: string,
    preview: string,
    body: string,
    wa: string,
    modelUsed: string
  ) => {
    if (!campaign) return;
    await supabase.from("generated_emails").insert({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
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

  const generate = async () => {
    setGenerating(true);
    setAiBody("");
    setEditBody("");
    setWhatsapp("");
    setSubjectLine("");

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

      const subjectMatch = fullText.match(/## Subject Line\n(.+)/);
      const previewMatch = fullText.match(/## Preview Text\n(.+)/);
      const whatsappMatch = fullText.match(/## WhatsApp Version\n([\s\S]+?)(?=\n## |$)/);
      const bodyMatch = fullText.match(/## Email Body\n([\s\S]+?)(?=\n## WhatsApp|$)/);

      const parsedSubject = subjectMatch ? subjectMatch[1].trim() : "";
      const parsedPreview = previewMatch ? previewMatch[1].trim() : "";
      const parsedBody = bodyMatch ? bodyMatch[1].trim() : fullText;
      const parsedWhatsapp = whatsappMatch ? whatsappMatch[1].trim() : "";

      if (parsedSubject) setSubjectLine(parsedSubject);
      if (parsedPreview) setPreviewText(parsedPreview);
      if (parsedWhatsapp) setWhatsapp(parsedWhatsapp);

      await saveToLibrary(parsedSubject, parsedPreview, parsedBody, parsedWhatsapp, modelUsed);

    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Generation error");
    }
    setGenerating(false);
  };

  const save = async () => {
    if (!id) return;
    await supabase.from("campaigns").update({
      subject_line: subjectLine,
      preview_text: previewText,
      body_markdown: editBody,
      whatsapp_copy: whatsapp,
    }).eq("id", id);
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
    setPushingKlaviyo(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-to-klaviyo", {
        body: { campaign_id: campaign.id },
      });
      if (error) throw error;
      if (data?.klaviyo_url) {
        toast.success(
          <span>
            Pushed to Klaviyo!{" "}
            <a href={data.klaviyo_url} target="_blank" rel="noopener noreferrer" className="underline">
              Open in Klaviyo →
            </a>
          </span>
        );
      } else {
        toast.success("Campaign pushed to Klaviyo as draft");
      }
    } catch (e: any) {
      toast.error("Klaviyo push failed: " + (e?.message || "unknown error"));
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
          <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
            <RefreshCw className={`mr-1 h-3 w-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Regenerate"}
          </Button>
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
            disabled={pushingKlaviyo || !campaign?.subject_line}
          >
            <Send className="mr-1 h-3 w-3" />
            {pushingKlaviyo ? "Pushing..." : "→ Klaviyo"}
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editable */}
        <div className="flex-1 border-r overflow-auto p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">Editable</Badge>
            <Badge variant="outline" className="text-xs">{campaign.framework}</Badge>
          </div>
          <Textarea
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
            bodyMarkdown={aiBody}
            whatsappCopy={whatsapp}
            heroImageUrl={(campaign as any)?.hero_image_url}
            products={(campaign as any)?.products_data as any[] || []}
            language={campaign?.language}
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
    </div>
  );
}
