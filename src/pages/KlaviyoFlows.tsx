import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  RefreshCw, Mail, MessageSquare, Zap, ChevronDown, ChevronUp,
  TrendingUp, MousePointerClick, Euro, CalendarDays, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlowKPI {
  opens: number | null;
  open_rate: number | null;
  clicks: number | null;
  click_rate: number | null;
  revenue: number | null;
}

interface KlaviyoFlow {
  id: string;
  name: string;
  status: string;
  trigger_type: string | null;
  archived: boolean;
  created: string;
  updated: string;
  email_count: number;
  sms_count: number;
  total_actions: number;
  kpi: FlowKPI | null;
  kpi_available: boolean;
}

interface FlowEmail {
  position: number;
  action_id: string;
  action_status: string;
  subject: string;
  preview_text: string;
  label: string;
}

type TimeframeKey = "last_7_days" | "last_30_days" | "last_90_days" | "last_365_days" | "this_year";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEFRAME_OPTIONS: { value: TimeframeKey; label: string; short: string }[] = [
  { value: "last_7_days",   label: "Ultimi 7 giorni",  short: "7gg"  },
  { value: "last_30_days",  label: "Ultimi 30 giorni", short: "30gg" },
  { value: "last_90_days",  label: "Ultimi 90 giorni", short: "90gg" },
  { value: "last_365_days", label: "Ultimi 365 giorni",short: "365gg"},
  { value: "this_year",     label: "Anno corrente",    short: "2026" },
];

const TRIGGER_LABELS: Record<string, string> = {
  list:          "Iscrizione lista",
  segment:       "Entra in segmento",
  metric:        "Evento",
  price_drop:    "Calo prezzo",
  back_in_stock: "Ritorno stock",
  low_inventory: "Stock basso",
  date:          "Data ricorrenza",
  api:           "API / custom",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  live:     { label: "Live",     color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  draft:    { label: "Draft",    color: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-400"  },
  manual:   { label: "Manual",   color: "bg-blue-100 text-blue-800 border-blue-200",          dot: "bg-blue-400"   },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200",          dot: "bg-gray-400"   },
};

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPct(v: number | null) {
  if (v === null || v === undefined) return "—";
  return (v * 100).toFixed(1) + "%";
}
function fmtEur(v: number | null) {
  if (!v) return "—";
  return "€" + v.toLocaleString("it-IT", { maximumFractionDigits: 0 });
}
function fmtNum(v: number | null) {
  if (v === null) return "";
  return "(" + v.toLocaleString("it-IT") + ")";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KlaviyoFlows() {
  const [flows, setFlows]             = useState<KlaviyoFlow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [lastLoaded, setLastLoaded]   = useState<Date | null>(null);
  const [timeframe, setTimeframe]     = useState<TimeframeKey>("last_30_days");
  const [kpiAvailable, setKpiAvailable] = useState<boolean | null>(null);

  const [expanded, setExpanded]             = useState<string | null>(null);
  const [flowEmails, setFlowEmails]         = useState<Record<string, FlowEmail[]>>({});
  const [loadingEmails, setLoadingEmails]   = useState<string | null>(null);

  const load = async (tf: TimeframeKey = timeframe) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-klaviyo-flows", {
        body: { timeframe: tf },
      });
      if (error) throw error;
      setFlows(data.flows || []);
      setKpiAvailable(data.kpi_available ?? false);
      setLastLoaded(new Date());
    } catch (e: any) {
      toast.error("Errore: " + (e?.message || "controlla la Klaviyo API key in Brand Settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTimeframeChange = (v: TimeframeKey) => {
    setTimeframe(v);
    setFlowEmails({});
    load(v);
  };

  const toggleExpand = async (flowId: string) => {
    if (expanded === flowId) { setExpanded(null); return; }
    setExpanded(flowId);
    if (flowEmails[flowId]) return;

    setLoadingEmails(flowId);
    try {
      const { data, error } = await supabase.functions.invoke("get-klaviyo-flows", {
        body: { flow_id: flowId },
      });
      if (error) throw error;
      setFlowEmails((prev) => ({ ...prev, [flowId]: data.emails || [] }));
    } catch (e: any) {
      toast.error("Errore caricamento email: " + e?.message);
    } finally {
      setLoadingEmails(null);
    }
  };

  const liveFlows     = flows.filter((f) => f.status === "live");
  const draftFlows    = flows.filter((f) => f.status === "draft" || f.status === "manual");
  const archivedFlows = flows.filter((f) => f.status === "archived" || f.archived);

  const totalRevenue = flows.reduce((s, f) => s + (f.kpi?.revenue || 0), 0);
  const totalEmails  = flows.reduce((s, f) => s + f.email_count, 0);

  const activeTfLabel = TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.label || "";
  const activeTfShort = TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.short || "";

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  // ── FlowCard ──────────────────────────────────────────────────────────────

  const FlowCard = ({ flow }: { flow: KlaviyoFlow }) => {
    const statusCfg = STATUS_CONFIG[flow.status] || STATUS_CONFIG.draft;
    const isOpen    = expanded === flow.id;
    const emails    = flowEmails[flow.id];
    const isLoadingThis = loadingEmails === flow.id;

    const triggerLabel = flow.trigger_type
      ? TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type
      : "Trigger non specificato";

    return (
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="flex items-start gap-3 p-4">
          <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-medium text-sm leading-tight">{flow.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                {triggerLabel}
              </span>
              {flow.email_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {flow.email_count} email
                </span>
              )}
              {flow.sms_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {flow.sms_count} SMS
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Aggiornato: {formatDate(flow.updated)}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">Open</span>
                <span className={
                  flow.kpi?.open_rate != null
                    ? flow.kpi.open_rate >= 0.30 ? "text-emerald-600"
                    : flow.kpi.open_rate >= 0.20 ? "text-amber-600"
                    : "text-red-500"
                    : "text-muted-foreground"
                }>
                  {fmtPct(flow.kpi?.open_rate ?? null)}
                </span>
                {flow.kpi?.opens != null && (
                  <span className="text-muted-foreground font-normal">{fmtNum(flow.kpi.opens)}</span>
                )}
              </span>

              <span className="flex items-center gap-1.5 text-xs font-medium">
                <MousePointerClick className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-muted-foreground">Click</span>
                <span className={
                  flow.kpi?.click_rate != null
                    ? flow.kpi.click_rate >= 0.05 ? "text-emerald-600"
                    : flow.kpi.click_rate >= 0.02 ? "text-amber-600"
                    : "text-red-500"
                    : "text-muted-foreground"
                }>
                  {fmtPct(flow.kpi?.click_rate ?? null)}
                </span>
                {flow.kpi?.clicks != null && (
                  <span className="text-muted-foreground font-normal">{fmtNum(flow.kpi.clicks)}</span>
                )}
              </span>

              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Euro className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Fatturato</span>
                <span className={flow.kpi?.revenue ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  {fmtEur(flow.kpi?.revenue ?? null)}
                </span>
              </span>

              {kpiAvailable === false && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  KPI non disponibili
                </span>
              )}
            </div>
          </div>

          {flow.total_actions > 0 && (
            <button
              onClick={() => toggleExpand(flow.id)}
              className="shrink-0 mt-1 p-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={isOpen ? "Chiudi email" : "Mostra email del flow"}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isOpen && (
          <div className="border-t bg-muted/20 px-4 py-3">
            {isLoadingThis ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Caricamento email del flow…
              </div>
            ) : emails && emails.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Email nella sequenza ({emails.length})
                </p>
                {emails.map((email) => (
                  <div key={email.action_id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                      {email.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{email.subject}</p>
                      {email.preview_text && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                          {email.preview_text}
                        </p>
                      )}
                      {email.label && email.label !== email.subject && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">{email.label}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0
                      ${email.action_status === "live"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {email.action_status}
                    </span>
                  </div>
                ))}
              </>
            ) : emails ? (
              <p className="text-sm text-muted-foreground py-2">
                Nessuna email trovata. Il flow potrebbe usare solo SMS o delay.
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klaviyo Flows</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stato live, KPI e contenuto delle email nei flussi automatici
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={timeframe} onValueChange={(v) => handleTimeframeChange(v as TimeframeKey)}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {lastLoaded && (
            <span className="text-xs text-muted-foreground">
              {lastLoaded.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {lastLoaded && (
        <p className="text-xs text-muted-foreground -mt-3 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          KPI periodo:
          <strong className="text-foreground">{activeTfLabel}</strong>
          {kpiAvailable === false && (
            <span className="ml-2 flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Dati KPI non disponibili dal tuo piano Klaviyo
            </span>
          )}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{liveFlows.length}</p>
                <p className="text-xs text-muted-foreground">Flow live</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div>
                <p className="text-2xl font-bold">{draftFlows.length}</p>
                <p className="text-xs text-muted-foreground">Draft / Manual</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalEmails}</p>
                <p className="text-xs text-muted-foreground">Email totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Euro className="h-5 w-5 text-emerald-500" />
              <div>
                <p className={`text-2xl font-bold ${totalRevenue > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {totalRevenue > 0 ? fmtEur(totalRevenue) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Fatturato {activeTfShort}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && flows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Caricamento flussi Klaviyo…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {liveFlows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  Flow Live ({liveFlows.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {liveFlows.map((f) => <FlowCard key={f.id} flow={f} />)}
              </CardContent>
            </Card>
          )}

          {draftFlows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  Draft / Manual ({draftFlows.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {draftFlows.map((f) => <FlowCard key={f.id} flow={f} />)}
              </CardContent>
            </Card>
          )}

          {archivedFlows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400 inline-block" />
                  Archiviati ({archivedFlows.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {archivedFlows.map((f) => <FlowCard key={f.id} flow={f} />)}
              </CardContent>
            </Card>
          )}

          {flows.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nessun flusso trovato. Verifica la Klaviyo API key in Brand Settings.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
