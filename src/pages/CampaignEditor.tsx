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
import { RefreshCw, Check, Save, Send, Pencil, Trash2 } from "lucide-react";
import EmailPreview from "@/components/EmailPreview";

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

  const generate = async () => {
    setGenerating(true);
    setAiBody("");
    setEditBody("");
    setWhatsapp("");
    setSubjectLine("");
    setParsedEmails([]);
    setIsSequence(false);
    setActiveEmailIndex(0);

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
            {generating ? "Generating..." : aiBody ? "Regenerate" : "Generate"}
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
