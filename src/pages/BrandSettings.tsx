import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

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

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    const promises = Object.entries(settings).map(([key, value]) =>
      supabase.from("brand_settings").update({ value }).eq("key", key)
    );
    await Promise.all(promises);
    toast.success("Settings saved!");
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure easysea® brand voice and integrations</p>
        </div>
        <Button onClick={save}><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice</CardTitle>
          <CardDescription>This description is injected into every AI prompt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Voice Description</Label>
            <Textarea value={settings.brand_voice || ""} onChange={(e) => update("brand_voice", e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Persona Fallback</Label>
              <Input value={settings.persona_fallback || ""} onChange={(e) => update("persona_fallback", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Input value={settings.default_language || ""} onChange={(e) => update("default_language", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Excluded Shopify Tags</Label>
            <Input value={settings.excluded_tags || ""} onChange={(e) => update("excluded_tags", e.target.value)} placeholder="preorder, hidden" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrations</CardTitle>
          <CardDescription>API keys for external services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Klaviyo API Key</Label>
            <Input type="password" value={settings.klaviyo_api_key || ""} onChange={(e) => update("klaviyo_api_key", e.target.value)} placeholder="pk_..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shopify Store URL</Label>
              <Input value={settings.shopify_store_url || ""} onChange={(e) => update("shopify_store_url", e.target.value)} placeholder="your-store.myshopify.com" />
            </div>
            <div className="space-y-2">
              <Label>Shopify Admin API Token</Label>
              <Input type="password" value={settings.shopify_admin_token || ""} onChange={(e) => update("shopify_admin_token", e.target.value)} placeholder="shpat_..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notion Integration Token</Label>
            <Input type="password" value={settings.notion_token || ""} onChange={(e) => update("notion_token", e.target.value)} placeholder="ntn_..." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
