import { useEffect, useState } from "react";
import EmailPreview from "@/components/EmailPreview";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Trash2, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";

interface GeneratedEmail {
  id: string;
  campaign_id: string | null;
  campaign_name: string;
  subject_line: string | null;
  preview_text: string | null;
  body_markdown: string | null;
  whatsapp_copy: string | null;
  language: string | null;
  framework: string | null;
  model_used: string | null;
  created_at: string;
}

export default function Library() {
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneratedEmail | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_emails")
      .select("*")
      .order("created_at", { ascending: false });
    setEmails((data as GeneratedEmail[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("generated_emails")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success("Email deleted from library");
      setEmails((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const filtered = emails.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.campaign_name.toLowerCase().includes(q) ||
      (e.subject_line || "").toLowerCase().includes(q) ||
      (e.framework || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every generated email is saved here. Delete only when you're sure.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by campaign name, subject, or framework…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {search ? "No results for this search." : "No emails generated yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <Card key={email.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{email.subject_line || "(no subject)"}</CardTitle>
                    <CardDescription className="mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground/70">{email.campaign_name}</span>
                      <span>·</span>
                      <span>{formatDate(email.created_at)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.model_used === "claude" ? (
                      <Badge className="bg-teal-600 text-white gap-1">
                        <Sparkles className="h-3 w-3" /> Claude
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3" /> Gemini
                      </Badge>
                    )}
                    {email.language && (
                      <Badge variant="outline">{email.language.toUpperCase()}</Badge>
                    )}
                    {email.framework && (
                      <Badge variant="outline" className="hidden sm:flex">{email.framework}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                    >
                      {expanded === email.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(email)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expanded === email.id && (
                <CardContent className="pt-0 space-y-4">
                  {email.preview_text && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Preview Text</p>
                      <p className="text-sm text-muted-foreground italic">{email.preview_text}</p>
                    </div>
                  )}
                  {email.body_markdown && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email Body</p>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded-md overflow-auto max-h-96">
                        {email.body_markdown}
                      </pre>
                    </div>
                  )}
                  {email.whatsapp_copy && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">WhatsApp</p>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded-md">
                        {email.whatsapp_copy}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this email?</DialogTitle>
            <DialogDescription>
              <strong>"{deleteTarget?.subject_line || deleteTarget?.campaign_name}"</strong> will be permanently removed from the library. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
