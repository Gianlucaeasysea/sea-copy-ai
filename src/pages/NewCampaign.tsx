import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Sparkles } from "lucide-react";

const campaignTypes = [
  "Product Launch", "Promo Weekend", "Newsletter", "Storytelling",
  "Abandoned Cart", "Welcome Series", "Announcement",
];

const frameworks = [
  "AIDA", "PAS", "SOAP Opera Sequence", "Before-After-Bridge",
  "4 Ps", "StoryBrand", "Feature-Benefit-Proof", "Plain Broadcast",
];

const tones = ["Curiosity", "Urgency", "Benefit-led", "Story hook", "Direct"];

export default function NewCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    type: "Product Launch",
    language: "it",
    framework: "AIDA",
    subject_tone: "Curiosity",
    context_notes: "",
    preview_text: "{{ person.first_name|title|default:'Sea Lover' }}",
  });
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("campaigns").insert({
      name: form.name,
      type: form.type,
      language: form.language,
      framework: form.framework,
      subject_tone: form.subject_tone,
      context_notes: form.context_notes || null,
      preview_text: form.preview_text,
      status: "draft",
    }).select().single();

    if (error) {
      toast.error("Failed to create campaign");
      setLoading(false);
      return;
    }
    toast.success("Campaign created!");
    navigate(`/campaign/${data.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-muted-foreground text-sm mt-1">Step {step} of 2</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input placeholder="e.g. Summer Regatta Collection Launch" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{campaignTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => update("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Framework</Label>
                <Select value={form.framework} onValueChange={(v) => update("framework", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{frameworks.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject Line Tone</Label>
                <Select value={form.subject_tone} onValueChange={(v) => update("subject_tone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Preview Text Variable</Label>
              <Input value={form.preview_text} onChange={(e) => update("preview_text", e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Context Notes (optional)</Label>
              <Textarea placeholder="Paste Notion page URL, product details, or any background context..." value={form.context_notes} onChange={(e) => update("context_notes", e.target.value)} rows={4} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create & Generate Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
