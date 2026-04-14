import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Mail, MessageSquare, Zap } from "lucide-react";

interface KlaviyoFlow {
  id: string;
  name: string;
  status: "live" | "draft" | "archived" | "manual";
  trigger_type: string;
  archived: boolean;
  created: string;
  updated: string;
  email_count: number;
  sms_count: number;
  total_actions: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  "list":          "Iscrizione lista",
  "segment":       "Entra in segmento",
  "metric":        "Evento (es. acquisto)",
  "price_drop":    "Calo prezzo",
  "back_in_stock": "Ritorno stock",
  "low_inventory": "Stock basso",
  "date":          "Data ricorrenza",
  "api":           "API / custom",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  live:     { label: "Live",     color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  draft:    { label: "Draft",    color: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-400"  },
  manual:   { label: "Manual",   color: "bg-blue-100 text-blue-800 border-blue-200",          dot: "bg-blue-400"   },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200",          dot: "bg-gray-400"   },
};

export default function KlaviyoFlows() {
  const [flows, setFlows] = useState<KlaviyoFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-klaviyo-flows");
      if (error) throw error;
      setFlows(data.flows || []);
      setLastLoaded(new Date());
    } catch (e: any) {
      toast.error("Errore: " + (e?.message || "controlla la Klaviyo API key in Brand Settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const liveFlows     = flows.filter((f) => f.status === "live");
  const draftFlows    = flows.filter((f) => f.status === "draft" || f.status === "manual");
  const archivedFlows = flows.filter((f) => f.status === "archived" || f.archived);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const FlowCard = ({ flow }: { flow: KlaviyoFlow }) => {
    const status = STATUS_CONFIG[flow.status] || STATUS_CONFIG.draft;
    return (
      <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
        <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${status.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-medium text-sm leading-tight">{flow.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
            </span>
            {flow.email_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {flow.email_count} email
              </span>
            )}
            {flow.sms_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {flow.sms_count} SMS
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Aggiornato: {formatDate(flow.updated)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klaviyo Flows</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stato live di tutti i flussi automatici attivi su Klaviyo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastLoaded && (
            <span className="text-xs text-muted-foreground">
              Aggiornato alle {lastLoaded.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold">
                  {flows.reduce((sum, f) => sum + f.email_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Email totali nei flow</p>
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
              <CardContent className="space-y-2">
                {liveFlows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
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
              <CardContent className="space-y-2">
                {draftFlows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
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
              <CardContent className="space-y-2">
                {archivedFlows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
              </CardContent>
            </Card>
          )}

          {flows.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nessun flusso trovato. Verifica che la Klaviyo API key sia configurata.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
