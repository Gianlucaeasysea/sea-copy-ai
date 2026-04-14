import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    const klaviyoKey = settings.klaviyo_api_key;
    if (!klaviyoKey) throw new Error("Klaviyo API key not configured");

    const kHeaders = {
      Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
      revision: "2024-10-15",
      Accept: "application/json",
    };

    const flowsRes = await fetch(
      "https://a.klaviyo.com/api/flows/?page[size]=50&fields[flow]=name,status,created,updated,archived",
      { headers: kHeaders }
    );

    if (!flowsRes.ok) {
      const errBody = await flowsRes.text();
      console.error("Klaviyo flows error:", flowsRes.status, errBody);
      throw new Error(`Klaviyo flows error: ${flowsRes.status} — ${errBody}`);
    }
    const flowsJson = await flowsRes.json();
    const flows: any[] = flowsJson.data || [];

    const enrichedFlows = await Promise.all(
      flows.map(async (flow: any) => {
        try {
          const actionsRes = await fetch(
            `https://a.klaviyo.com/api/flows/${flow.id}/flow-actions/` +
              "?fields[flow-action]=action_type,status,settings",
            { headers: kHeaders }
          );
          const actionsJson = actionsRes.ok ? await actionsRes.json() : { data: [] };
          const actions: any[] = actionsJson.data || [];

          const emailActions = actions.filter((a: any) => a.attributes?.action_type === "send_email");
          const smsActions   = actions.filter((a: any) => a.attributes?.action_type === "send_sms");

          return {
            id: flow.id,
            name: flow.attributes?.name || "Untitled",
            status: flow.attributes?.status || "unknown",
            trigger_type: flow.attributes?.trigger_type || "unknown",
            archived: flow.attributes?.archived || false,
            created: flow.attributes?.created,
            updated: flow.attributes?.updated,
            email_count: emailActions.length,
            sms_count: smsActions.length,
            total_actions: actions.length,
          };
        } catch {
          return {
            id: flow.id,
            name: flow.attributes?.name || "Untitled",
            status: flow.attributes?.status || "unknown",
            trigger_type: flow.attributes?.trigger_type || "unknown",
            archived: flow.attributes?.archived || false,
            created: flow.attributes?.created,
            updated: flow.attributes?.updated,
            email_count: 0,
            sms_count: 0,
            total_actions: 0,
          };
        }
      })
    );

    enrichedFlows.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });

    return new Response(
      JSON.stringify({ flows: enrichedFlows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-klaviyo-flows error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
