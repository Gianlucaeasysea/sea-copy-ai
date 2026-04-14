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
  end_date: string | null;
  event_type: string;
  campaign_id: string | null;
  notes: string | null;
  requires_email: boolean;
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
const TYPE_BG_COLORS: Record<string, string> = {
  promo: "bg-blue-500/80 text-white",
  launch: "bg-purple-500/80 text-white",
  seasonal: "bg-amber-500/80 text-white",
  holiday: "bg-red-500/80 text-white",
  content: "bg-emerald-500/80 text-white",
  other: "bg-gray-400/80 text-white",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** Parse YYYY-MM-DD to a comparable number YYYYMMDD */
function dateToNum(d: string) {
  return parseInt(d.replace(/-/g, ""), 10);
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface SpanBar {
  event: MarketingEvent;
  row: number;
  startCol: number; // 0-6 within the week row
  spanCols: number; // how many cols this bar spans
  isStart: boolean; // is this the first segment of the event
  isEnd: boolean; // is this the last segment
}

export default function MarketingCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState<MarketingEvent | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formType, setFormType] = useState("promo");
  const [formNotes, setFormNotes] = useState("");
  const [formCampaignId, setFormCampaignId] = useState<string>("none");
  const [formRequiresEmail, setFormRequiresEmail] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const campaignMap = useMemo(() => {
    const m: Record<string, Campaign> = {};
    campaigns.forEach((c) => (m[c.id] = c));
    return m;
  }, [campaigns]);

  // Split events into single-day and multi-day
  const { singleDayByDate, multiDayEvents } = useMemo(() => {
    const single: Record<string, MarketingEvent[]> = {};
    const multi: MarketingEvent[] = [];
    events.forEach((e) => {
      if (e.end_date && e.end_date !== e.event_date) {
        multi.push(e);
      } else {
        (single[e.event_date] ??= []).push(e);
      }
    });
    return { singleDayByDate: single, multiDayEvents: multi };
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const openAdd = (dateString?: string) => {
    setEditEvent(null);
    setFormName("");
    setFormDate(dateString || `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`);
    setFormEndDate("");
    setFormType("promo");
    setFormNotes("");
    setFormCampaignId("none");
    setFormRequiresEmail(false);
    setShowAdd(true);
  };

  const openEdit = (ev: MarketingEvent) => {
    setEditEvent(ev);
    setFormName(ev.name);
    setFormDate(ev.event_date);
    setFormEndDate(ev.end_date || "");
    setFormType(ev.event_type);
    setFormNotes(ev.notes || "");
    setFormCampaignId(ev.campaign_id || "none");
    setFormRequiresEmail(ev.requires_email);
    setShowAdd(true);
  };

  const saveEvent = async () => {
    if (!formName.trim() || !formDate) return;
    const payload: any = {
      name: formName.trim(),
      event_date: formDate,
      end_date: formEndDate || null,
      event_type: formType,
      notes: formNotes.trim() || null,
      campaign_id: formCampaignId === "none" ? null : formCampaignId,
      requires_email: formRequiresEmail,
    };

    if (editEvent) {
      const { error } = await supabase.from("marketing_events").update(payload).eq("id", editEvent.id);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Evento aggiornato");
    } else {
      const { error } = await supabase.from("marketing_events").insert(payload);
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
      toast.error("CSV deve avere colonne 'nome/name' e 'data/date'"); return;
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
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalWeekRows = cells.length / 7;

  // Compute multi-day bar positions
  const spanBars = useMemo(() => {
    const bars: SpanBar[] = [];
    // For each week row, track which "lane" rows are occupied
    const weekLanes: Map<number, boolean[]>[] = [];
    for (let w = 0; w < totalWeekRows; w++) weekLanes.push(new Map());

    // Sort multi-day events by start date, then by duration (longer first)
    const sorted = [...multiDayEvents].sort((a, b) => {
      const diff = dateToNum(a.event_date) - dateToNum(b.event_date);
      if (diff !== 0) return diff;
      const durA = dateToNum(a.end_date!) - dateToNum(a.event_date);
      const durB = dateToNum(b.end_date!) - dateToNum(b.event_date);
      return durB - durA;
    });

    for (const ev of sorted) {
      const evStart = dateToNum(ev.event_date);
      const evEnd = dateToNum(ev.end_date!);

      // Find which cells this event covers in the current month view
      for (let weekRow = 0; weekRow < totalWeekRows; weekRow++) {
        const weekStartIdx = weekRow * 7;
        let firstCellInWeek = -1;
        let lastCellInWeek = -1;

        for (let col = 0; col < 7; col++) {
          const day = cells[weekStartIdx + col];
          if (day === null) continue;
          const d = dateToNum(dateStr(viewYear, viewMonth, day));
          if (d >= evStart && d <= evEnd) {
            if (firstCellInWeek === -1) firstCellInWeek = col;
            lastCellInWeek = col;
          }
        }

        if (firstCellInWeek === -1) continue; // event doesn't touch this week

        const spanCols = lastCellInWeek - firstCellInWeek + 1;

        // Find a free lane
        let lane = 0;
        const lanes = weekLanes[weekRow];
        while (true) {
          let occupied = false;
          if (!lanes.has(lane)) lanes.set(lane, Array(7).fill(false) as any);
          // Check type properly
          const laneSlots = lanes.get(lane) as unknown as boolean[];
          for (let c = firstCellInWeek; c <= lastCellInWeek; c++) {
            if (laneSlots[c]) { occupied = true; break; }
          }
          if (!occupied) break;
          lane++;
        }

        // Mark slots occupied
        const laneSlots = lanes.get(lane) as unknown as boolean[];
        if (!laneSlots) lanes.set(lane, Array(7).fill(false) as any);
        const slots = lanes.get(lane) as unknown as boolean[];
        for (let c = firstCellInWeek; c <= lastCellInWeek; c++) slots[c] = true;

        // Determine if this is the start/end segment
        const firstDayInWeek = cells[weekStartIdx + firstCellInWeek]!;
        const lastDayInWeek = cells[weekStartIdx + lastCellInWeek]!;
        const isStart = dateToNum(dateStr(viewYear, viewMonth, firstDayInWeek)) === evStart;
        const isEnd = dateToNum(dateStr(viewYear, viewMonth, lastDayInWeek)) === evEnd;

        bars.push({
          event: ev,
          row: weekRow,
          startCol: firstCellInWeek,
          spanCols,
          isStart,
          isEnd,
        });
      }
    }

    return bars;
  }, [multiDayEvents, cells, totalWeekRows, viewYear, viewMonth]);

  // Group bars by week row
  const barsByWeek = useMemo(() => {
    const map: Record<number, SpanBar[]> = {};
    spanBars.forEach((b) => (map[b.row] ??= []).push(b));
    return map;
  }, [spanBars]);

  // Calculate max lanes per week (for spacing)
  const maxLanesByWeek = useMemo(() => {
    const m: Record<number, number> = {};
    for (const b of spanBars) {
      // We assigned lanes implicitly via order; count by checking overlapping bars
    }
    // Simpler: for each week, count distinct lanes
    const weekLaneSets: Record<number, Set<string>> = {};
    for (const b of spanBars) {
      (weekLaneSets[b.row] ??= new Set()).add(b.event.id);
    }
    // Actually we need to compute lane index per bar. Let me re-approach via the bars.
    // Since bars were assigned in order, I'll compute the lane from bar index collision.
    return m;
  }, [spanBars]);

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
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Render week by week so we can overlay multi-day bars */}
          {Array.from({ length: totalWeekRows }, (_, weekRow) => {
            const weekCells = cells.slice(weekRow * 7, weekRow * 7 + 7);
            const weekBars = barsByWeek[weekRow] || [];
            // Count number of bar lanes needed
            const laneCount = weekBars.length > 0
              ? Math.max(...weekBars.map((_, idx) => idx)) + 1
              : 0;
            // Actually compute real lane indices by collision detection
            const barLanes: number[] = [];
            const laneOccupancy: boolean[][] = [];
            for (const bar of weekBars) {
              let lane = 0;
              while (true) {
                if (!laneOccupancy[lane]) laneOccupancy[lane] = Array(7).fill(false);
                let free = true;
                for (let c = bar.startCol; c < bar.startCol + bar.spanCols; c++) {
                  if (laneOccupancy[lane][c]) { free = false; break; }
                }
                if (free) break;
                lane++;
              }
              if (!laneOccupancy[lane]) laneOccupancy[lane] = Array(7).fill(false);
              for (let c = bar.startCol; c < bar.startCol + bar.spanCols; c++) {
                laneOccupancy[lane][c] = true;
              }
              barLanes.push(lane);
            }
            const totalLanes = laneOccupancy.length;
            const barAreaHeight = totalLanes * 22; // 22px per lane

            return (
              <div key={weekRow} className="relative">
                <div className="grid grid-cols-7">
                  {weekCells.map((day, col) => {
                    if (day === null) return (
                      <div key={col} className="border-b border-r bg-muted/20 min-h-[100px]" style={{ paddingTop: barAreaHeight > 0 ? barAreaHeight + 24 : undefined }} />
                    );

                    const ds = dateStr(viewYear, viewMonth, day);
                    const dayEvents = singleDayByDate[ds] || [];
                    const isToday = ds === todayStr;

                    return (
                      <div
                        key={col}
                        className={`border-b border-r min-h-[100px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${isToday ? "bg-primary/5" : ""}`}
                        onClick={() => openAdd(ds)}
                        style={{ paddingTop: barAreaHeight > 0 ? barAreaHeight + 28 : undefined }}
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
                            const needsEmail = ev.requires_email;
                            // Determine background highlight for events needing email
                            const emailBg = needsEmail
                              ? hasEmail
                                ? "bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-400/50"
                                : "bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-400/50"
                              : "";
                            return (
                              <div
                                key={ev.id}
                                className={`group flex items-center gap-1 px-1 py-0.5 rounded text-[11px] leading-tight hover:bg-background/80 transition-colors ${emailBg}`}
                                onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                              >
                                <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[ev.event_type] || TYPE_COLORS.other}`} />
                                <span className="truncate flex-1 font-medium">{ev.name}</span>
                                {needsEmail && (
                                  hasEmail ? (
                                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                  ) : (
                                    <span className="text-amber-600 text-[10px] font-semibold shrink-0">✉</span>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multi-day bars overlay */}
                {weekBars.map((bar, idx) => {
                  const lane = barLanes[idx];
                  const colPercent = 100 / 7;
                  const left = bar.startCol * colPercent;
                  const width = bar.spanCols * colPercent;
                  const top = 24 + lane * 22; // 24px offset for day number

                  const typeColor = TYPE_BG_COLORS[bar.event.event_type] || TYPE_BG_COLORS.other;

                  return (
                    <div
                      key={`${bar.event.id}-${weekRow}`}
                      className={`absolute z-10 h-[18px] flex items-center cursor-pointer hover:opacity-90 transition-opacity ${typeColor} ${bar.isStart ? "rounded-l-md ml-1" : ""} ${bar.isEnd ? "rounded-r-md mr-1" : ""}`}
                      style={{
                        left: `${left}%`,
                        width: `calc(${width}% - ${(bar.isStart ? 4 : 0) + (bar.isEnd ? 4 : 0)}px)`,
                        marginLeft: bar.isStart ? "4px" : undefined,
                        top: `${top}px`,
                      }}
                      onClick={(e) => { e.stopPropagation(); openEdit(bar.event); }}
                    >
                      {bar.isStart && (
                        <span className="text-[10px] font-semibold truncate px-1.5 leading-none">
                          {bar.event.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
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
                <Label>Data inizio</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data fine <span className="text-muted-foreground text-xs">(opzionale)</span></Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} min={formDate} />
              </div>
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
