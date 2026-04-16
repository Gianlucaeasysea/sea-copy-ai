import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Sparkles, Zap, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function BrandSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{
    campaigns_analyzed: number;
    analyzed_at: string;
    date_range_start: string;
    date_range_end: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("brand_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      setSettings(map);

      const { data: analysis } = await supabase
        .from("brand_voice_analysis" as any)
        .select("campaigns_analyzed, analyzed_at, date_range_start, date_range_end")
        .eq("is_active", true)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();
      if (analysis) setLastAnalysis(analysis as any);

      setLoading(false);
    };
    load();
  }, []);

  const update = (key: string, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    const upserts = Object.entries(settings).map(([key, value]) =>
      supabase.from("brand_settings").upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(upserts);
    toast.success("Settings saved!");
  };

  const handleAnalyzeKlaviyo = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-klaviyo-voice");
      if (error) throw error;
      toast.success(
        `Analisi completata — ${data.campaigns_analyzed} campagne analizzate (${data.date_range}).`
      );
      setLastAnalysis({
        campaigns_analyzed: data.campaigns_analyzed,
        analyzed_at: new Date().toISOString(),
        date_range_start: data.date_range.split(" → ")[0],
        date_range_end: data.date_range.split(" → ")[1],
      });
    } catch (e: any) {
      toast.error("Analisi fallita: " + (e?.message || "errore sconosciuto"));
    } finally {
      setAnalyzing(false);
    }
  };

  const hasClaudeKey = !!settings.claude_api_key;

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura voce del brand e integrazioni easysea®
          </p>
        </div>
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Salva
        </Button>
      </div>

      {/* Brand Voice Analysis from Klaviyo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice da Klaviyo</CardTitle>
          <CardDescription>
            Scarica tutte le campagne email inviate nell'anno corrente e in quello precedente.
            Analizza subject line, hook, CTA, vocabolario e ritmo con esempi reali.
            Il risultato viene iniettato in ogni generazione AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastAnalysis ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
              <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-teal-800">
                  Analisi attiva — {lastAnalysis.campaigns_analyzed} campagne
                </p>
                <p className="text-xs text-teal-600">
                  Periodo: {lastAnalysis.date_range_start} → {lastAnalysis.date_range_end}
                </p>
                <p className="text-xs text-teal-500">
                  Aggiornata il{" "}
                  {new Date(lastAnalysis.analyzed_at).toLocaleString("it-IT", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Nessuna analisi ancora. L'AI usa la descrizione generica finché non esegui l'analisi.
              </p>
            </div>
          )}
          <Button
            onClick={handleAnalyzeKlaviyo}
            disabled={analyzing || !settings.klaviyo_api_key}
            className="w-full"
            variant={lastAnalysis ? "outline" : "default"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing
              ? "Analisi in corso… (1–3 minuti)"
              : lastAnalysis
              ? "Rianalizza campagne Klaviyo"
              : "Analizza campagne Klaviyo"}
          </Button>
          {!settings.klaviyo_api_key && (
            <p className="text-xs text-muted-foreground text-center">
              Aggiungi la Klaviyo API key nella sezione Klaviyo per abilitare questa funzione.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Model status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${hasClaudeKey ? "bg-teal-50 border-teal-200" : "bg-muted border-border"}`}>
        {hasClaudeKey ? (
          <>
            <Sparkles className="h-5 w-5 text-teal-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-teal-800">Claude Sonnet attivo</p>
              <p className="text-xs text-teal-600">La generazione usa la tua Anthropic API key</p>
            </div>
            <Badge className="ml-auto bg-teal-600">Claude</Badge>
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Gemini Flash attivo (default)</p>
              <p className="text-xs text-muted-foreground">Aggiungi una Claude API key per qualità superiore</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Gemini</Badge>
          </>
        )}
      </div>

      {/* Brand Voice (fallback) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice (fallback)</CardTitle>
          <CardDescription>
            Usato solo se l'analisi Klaviyo non è ancora stata eseguita
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Descrizione brand voice</Label>
            <Textarea
              value={settings.brand_voice || ""}
              onChange={(e) => update("brand_voice", e.target.value)}
              rows={4}
              placeholder="Energico, diretto, tecnico ma accessibile. Niente fluff. Marinai che parlano a marinai."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Persona fallback</Label>
              <Input
                value={settings.persona_fallback || ""}
                onChange={(e) => update("persona_fallback", e.target.value)}
                placeholder="Sea Lover"
              />
            </div>
            <div className="space-y-2">
              <Label>Lingua default</Label>
              <Input
                value={settings.default_language || ""}
                onChange={(e) => update("default_language", e.target.value)}
                placeholder="it"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tag Shopify esclusi (separati da virgola)</Label>
            <Input
              value={settings.excluded_tags || ""}
              onChange={(e) => update("excluded_tags", e.target.value)}
              placeholder="preorder, hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modello AI</CardTitle>
          <CardDescription>
            Lascia vuoto per usare Gemini (gratuito, incluso). Aggiungi la chiave Anthropic per Claude Sonnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Claude API Key (opzionale)</Label>
            <Input
              type="password"
              value={settings.claude_api_key || ""}
              onChange={(e) => update("claude_api_key", e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted-foreground">
              Ottieni la chiave su console.anthropic.com. L'uso di Claude Sonnet ha un costo Anthropic.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Klaviyo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Klaviyo</CardTitle>
          <CardDescription>
            Necessario per l'analisi del brand voice e per il push delle campagne come draft
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Klaviyo Private API Key</Label>
            <Input
              type="password"
              value={settings.klaviyo_api_key || ""}
              onChange={(e) => update("klaviyo_api_key", e.target.value)}
              placeholder="pk_..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                value={settings.klaviyo_from_email || ""}
                onChange={(e) => update("klaviyo_from_email", e.target.value)}
                placeholder="hello@easysea.org"
              />
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={settings.klaviyo_from_name || ""}
                onChange={(e) => update("klaviyo_from_name", e.target.value)}
                placeholder="easysea®"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canva</CardTitle>
          <CardDescription>
            API key per creare design direttamente in Canva. Ottienila su canva.com/developers (serve piano Teams/Enterprise).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Canva API Key</Label>
            <Input
              type="password"
              value={settings.canva_api_key || ""}
              onChange={(e) => update("canva_api_key", e.target.value)}
              placeholder="cnapi_..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Shopify */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shopify</CardTitle>
          <CardDescription>Per importare prodotti nelle campagne</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store URL</Label>
              <Input
                value={settings.shopify_store_url || ""}
                onChange={(e) => update("shopify_store_url", e.target.value)}
                placeholder="easysea-design-lab.myshopify.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Admin API Token</Label>
              <Input
                type="password"
                value={settings.shopify_admin_token || ""}
                onChange={(e) => update("shopify_admin_token", e.target.value)}
                placeholder="shpat_..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
