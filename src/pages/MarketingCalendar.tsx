import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Upload, Check, X, Pencil, Trash2, Link2, ExternalLink, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MarketingEvent {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  campaign_id: string | null;
  notes: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  subject_line: string | null;
}

const EVENT_TYPES = ["promo", "launch", "seasonal", "holiday", "content", "other"];
const TYPE_COLORS: Record<string, string> = {
  promo: "bg-blue-500",
  launch: "bg-purple-500",
  seasonal: "bg-amber-500",
  holiday: "bg-red-500",
  content: "bg-emerald-500",
  other: "bg-gray-400",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday-start
}

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState<MarketingEvent | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("promo");
  const [formNotes, setFormNotes] = useState("");
  const [formCampaignId, setFormCampaignId] = useState<string>("none");

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Notion import
  const [notionUrl, setNotionUrl] = useState("");
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionPreview, setNotionPreview] = useState<any[] | null>(null);

  const load = async () => {
    setLoading(true);
    const [evRes, campRes] = await Promise.all([
      supabase.from("marketing_events").select("*").order("event_date"),
      supabase.from("campaigns").select("id, name, status, subject_line").order("created_at", { ascending: false }),
    ]);
    setEvents((evRes.data as MarketingEvent[]) || []);
    setCampaigns((campRes.data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, MarketingEvent[]> = {};
    events.forEach((e) => {
      (map[e.event_date] ??= []).push(e);
    });
    return map;
  }, [events]);

  const campaignMap = useMemo(() => {
    const m: Record<string, Campaign> = {};
    campaigns.forEach((c) => (m[c.id] = c));
    return m;
  }, [campaigns]);

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // Form helpers
  const openAdd = (dateStr?: string) => {
    setEditEvent(null);
    setFormName("");
    setFormDate(dateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`);
    setFormType("promo");
    setFormNotes("");
    setFormCampaignId("none");
    setShowAdd(true);
  };

  const openEdit = (ev: MarketingEvent) => {
    setEditEvent(ev);
    setFormName(ev.name);
    setFormDate(ev.event_date);
    setFormType(ev.event_type);
    setFormNotes(ev.notes || "");
    setFormCampaignId(ev.campaign_id || "none");
    setShowAdd(true);
  };

  const saveEvent = async () => {
    if (!formName.trim() || !formDate) return;
    const payload = {
      name: formName.trim(),
      event_date: formDate,
      event_type: formType,
      notes: formNotes.trim() || null,
      campaign_id: formCampaignId === "none" ? null : formCampaignId,
    };

    if (editEvent) {
      const { error } = await supabase.from("marketing_events").update(payload).eq("id", editEvent.id);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Evento aggiornato");
    } else {
      const { error } = await supabase.from("marketing_events").insert(payload as any);
      if (error) { toast.error("Insert failed"); return; }
      toast.success("Evento creato");
    }
    setShowAdd(false);
    load();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("marketing_events").delete().eq("id", id);
    toast.success("Evento eliminato");
    load();
  };

  // CSV Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  };

  const importCsv = async () => {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { toast.error("CSV vuoto o senza header"); return; }

    const header = lines[0].toLowerCase().split(/[;,\t]/);
    const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("nome") || h.includes("evento"));
    const dateIdx = header.findIndex((h) => h.includes("date") || h.includes("data"));
    const typeIdx = header.findIndex((h) => h.includes("type") || h.includes("tipo"));
    const notesIdx = header.findIndex((h) => h.includes("note") || h.includes("notes") || h.includes("desc"));

    if (nameIdx < 0 || dateIdx < 0) {
      toast.error("CSV deve avere colonne 'nome/name' e 'data/date'");
      return;
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(/[;,\t]/);
      return {
        name: cols[nameIdx]?.trim() || "Evento",
        event_date: cols[dateIdx]?.trim(),
        event_type: typeIdx >= 0 ? (cols[typeIdx]?.trim().toLowerCase() || "other") : "other",
        notes: notesIdx >= 0 ? cols[notesIdx]?.trim() || null : null,
      };
    }).filter((r) => r.event_date && /\d{4}-\d{2}-\d{2}/.test(r.event_date));

    if (!rows.length) { toast.error("Nessuna riga valida trovata (formato data: YYYY-MM-DD)"); return; }

    const { error } = await supabase.from("marketing_events").insert(rows as any);
    if (error) { toast.error("Import failed: " + error.message); return; }
    toast.success(`${rows.length} eventi importati`);
    setShowImport(false);
    setCsvText("");
    load();
  };

  // Notion import
  const fetchNotion = async () => {
    if (!notionUrl.trim()) return;
    setNotionLoading(true);
    setNotionPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-notion-events", {
        body: { notion_url: notionUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const events = data?.events || [];
      if (!events.length) { toast.error("Nessun evento trovato nella pagina"); return; }
      setNotionPreview(events);
    } catch (err: any) {
      toast.error("Errore: " + (err.message || "Import fallito"));
    } finally {
      setNotionLoading(false);
    }
  };

  const confirmNotionImport = async () => {
    if (!notionPreview?.length) return;
    const rows = notionPreview.map((e: any) => ({
      name: e.name,
      event_date: e.event_date,
      event_type: e.event_type || "other",
      notes: e.notes || null,
    }));
    const { error } = await supabase.from("marketing_events").insert(rows as any);
    if (error) { toast.error("Insert failed"); return; }
    toast.success(`${rows.length} eventi importati da Notion`);
    setShowImport(false);
    setNotionUrl("");
    setNotionPreview(null);
    load();
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario Marketing</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pianifica gli eventi e verifica la copertura email
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="mr-1 h-3 w-3" /> Importa
          </Button>
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="mr-1 h-3 w-3" /> Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold min-w-[180px] text-center">
          {MONTHS_IT[viewMonth]} {viewYear}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday} className="ml-2 text-xs">
          Oggi
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[t]}`} />
            <span className="capitalize">{t}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-4">
          <Check className="h-3 w-3 text-primary" /> Email scritta
        </span>
        <span className="flex items-center gap-1.5">
          <X className="h-3 w-3 text-destructive" /> Da scrivere
        </span>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Caricamento…</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="border-b border-r bg-muted/20 min-h-[100px]" />;

              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={i}
                  className={`border-b border-r min-h-[100px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                  onClick={() => openAdd(dateStr)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isToday ? "bg-primary text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.map((ev) => {
                      const camp = ev.campaign_id ? campaignMap[ev.campaign_id] : null;
                      const hasEmail = camp && (camp.status === "approved" || camp.subject_line);
                      return (
                        <div
                          key={ev.id}
                          className="group flex items-center gap-1 px-1 py-0.5 rounded text-[11px] leading-tight hover:bg-background/80 transition-colors"
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[ev.event_type] || TYPE_COLORS.other}`} />
                          <span className="truncate flex-1 font-medium">{ev.name}</span>
                          {ev.campaign_id ? (
                            hasEmail ? (
                              <Check className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <span className="text-amber-500 text-[10px] shrink-0">draft</span>
                            )
                          ) : (
                            <X className="h-3 w-3 text-destructive/50 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Modifica Evento" : "Nuovo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome evento</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Es: Black Friday, Lancio prodotto…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="capitalize">{t}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Campagna collegata</Label>
              <Select value={formCampaignId} onValueChange={setFormCampaignId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nessuna —</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.status === "approved" ? "✓" : `(${c.status})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Dettagli opzionali…" className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {editEvent && (
                <Button variant="destructive" size="sm" onClick={() => { deleteEvent(editEvent.id); setShowAdd(false); }}>
                  <Trash2 className="mr-1 h-3 w-3" /> Elimina
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
              <Button onClick={saveEvent}>{editEvent ? "Salva" : "Crea"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog (CSV + Notion) */}
      <Dialog open={showImport} onOpenChange={(open) => { setShowImport(open); if (!open) { setCsvText(""); setNotionUrl(""); setNotionPreview(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importa Eventi</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Notion section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Da link Notion</Label>
              <p className="text-xs text-muted-foreground">
                Incolla il link di una pagina Notion pubblica con le date degli eventi. L'AI estrarrà automaticamente nomi e date.
              </p>
              <div className="flex gap-2">
                <Input
                  value={notionUrl}
                  onChange={(e) => setNotionUrl(e.target.value)}
                  placeholder="https://notion.so/..."
                  className="flex-1"
                />
                <Button onClick={fetchNotion} disabled={notionLoading || !notionUrl.trim()} size="sm">
                  {notionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                  <span className="ml-1">{notionLoading ? "Analizzo…" : "Estrai"}</span>
                </Button>
              </div>
              {notionPreview && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-primary">{notionPreview.length} eventi trovati:</p>
                  <div className="max-h-[180px] overflow-auto border rounded p-2 space-y-1">
                    {notionPreview.map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[ev.event_type] || TYPE_COLORS.other}`} />
                        <span className="font-medium">{ev.event_date}</span>
                        <span className="truncate">{ev.name}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={confirmNotionImport} size="sm" className="w-full">
                    <Plus className="mr-1 h-3 w-3" /> Importa {notionPreview.length} eventi
                  </Button>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">oppure</span></div>
            </div>

            {/* CSV section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Da file CSV</Label>
              <p className="text-xs text-muted-foreground">
                Colonne richieste: <strong>nome/name</strong> e <strong>data/date</strong> (YYYY-MM-DD). Opzionali: tipo, note.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {csvText && (
                <>
                  <pre className="text-xs font-mono bg-muted p-3 rounded max-h-[150px] overflow-auto whitespace-pre-wrap">
                    {csvText.slice(0, 1000)}{csvText.length > 1000 ? "…" : ""}
                  </pre>
                  <Button onClick={importCsv} size="sm" className="w-full">
                    <Upload className="mr-1 h-3 w-3" /> Importa CSV
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
