import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Sparkles, Zap } from "lucide-react";

export default function BrandSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("brand_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      setSettings(map);
      setLoading(false);
    };
    load();
  }, []);

  const update = (key: string, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    const upserts = Object.entries(settings).map(([key, value]) =>
      supabase
        .from("brand_settings")
        .upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(upserts);
    toast.success("Settings saved!");
  };

  const hasClaudeKey = !!settings.claude_api_key;

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure easysea® brand voice and integrations
          </p>
        </div>
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Save Settings
        </Button>
      </div>

      {/* AI Model status banner */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${hasClaudeKey ? "bg-teal-50 border-teal-200" : "bg-muted border-border"}`}>
        {hasClaudeKey ? (
          <>
            <Sparkles className="h-5 w-5 text-teal-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-teal-800">Claude Sonnet active</p>
              <p className="text-xs text-teal-600">Copy generation uses your Anthropic API key</p>
            </div>
            <Badge className="ml-auto bg-teal-600">Claude</Badge>
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Gemini Flash active (default)</p>
              <p className="text-xs text-muted-foreground">Add a Claude API key below to switch to higher-quality generation</p>
            </div>
            <Badge variant="secondary" className="ml-auto">Gemini</Badge>
          </>
        )}
      </div>

      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice</CardTitle>
          <CardDescription>Injected into every AI prompt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Voice Description</Label>
            <Textarea
              value={settings.brand_voice || ""}
              onChange={(e) => update("brand_voice", e.target.value)}
              rows={4}
              placeholder="Energetic, direct, technical but accessible. No fluff. Sailors talk to sailors."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Persona Fallback</Label>
              <Input
                value={settings.persona_fallback || ""}
                onChange={(e) => update("persona_fallback", e.target.value)}
                placeholder="Sea Lover"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Input
                value={settings.default_language || ""}
                onChange={(e) => update("default_language", e.target.value)}
                placeholder="it"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Excluded Shopify Tags (comma-separated)</Label>
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
          <CardTitle className="text-lg">AI Model</CardTitle>
          <CardDescription>
            Leave blank to use Gemini (free, included). Add your Anthropic key to use Claude Sonnet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Claude API Key (optional)</Label>
            <Input
              type="password"
              value={settings.claude_api_key || ""}
              onChange={(e) => update("claude_api_key", e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted-foreground">
              Get your key at console.anthropic.com. Using Claude Sonnet incurs Anthropic API costs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Klaviyo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Klaviyo</CardTitle>
          <CardDescription>Required to push campaigns directly to Klaviyo as drafts</CardDescription>
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

      {/* Shopify */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shopify</CardTitle>
          <CardDescription>Used to pull product data into campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store URL</Label>
              <Input
                value={settings.shopify_store_url || ""}
                onChange={(e) => update("shopify_store_url", e.target.value)}
                placeholder="your-store.myshopify.com"
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
