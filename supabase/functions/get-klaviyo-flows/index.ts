import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function findPlacedOrderMetricId(kHeaders: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(
      "https://a.klaviyo.com/api/metrics/?fields[metric]=name&page[size]=100",
      { headers: kHeaders }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const match = (json.data || []).find(
      (m: any) =>
        m.attributes?.name?.toLowerCase().includes("placed order") ||
        m.attributes?.name?.toLowerCase().includes("ordine effettuato")
    );
    return match?.id || null;
  } catch {
    return null;
  }
}

interface FlowKPI {
  opens: number | null;
  open_rate: number | null;
  clicks: number | null;
  click_rate: number | null;
  revenue: number | null;
}

type TimeframeKey = "last_7_days" | "last_30_days" | "last_90_days" | "last_365_days" | "this_year";

async function getFlowKPIs(
  kHeaders: Record<string, string>,
  conversionMetricId: string | null,
  timeframeKey: TimeframeKey = "last_30_days"
): Promise<Record<string, FlowKPI>> {
  try {
    // conversion_metric_id is required by Klaviyo API
    if (!conversionMetricId) {
      console.warn("No conversion metric found — skipping KPI fetch");
      return {};
    }

    const statistics = ["opens", "open_rate", "clicks", "click_rate", "attributed_revenue"];

    const payload: any = {
      data: {
        type: "flow-values-report",
        attributes: {
          timeframe: { key: timeframeKey },
          statistics,
          conversion_metric_id: conversionMetricId,
        },
      },
    };

    const res = await fetch("https://a.klaviyo.com/api/flow-values-reports/", {
      method: "POST",
      headers: { ...kHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn("flow-values-reports failed:", res.status, await res.text());
      return {};
    }

    const json = await res.json();
    const results: any[] = json.data?.attributes?.results || [];

    const kpiMap: Record<string, FlowKPI> = {};
    for (const r of results) {
      const flowId =
        r.group_by?.find((g: any) => g.type === "flow_id" || g.type === "flow")?.value ||
        r.id;
      if (!flowId) continue;
      kpiMap[flowId] = {
        opens:      r.statistics?.opens       ?? null,
        open_rate:  r.statistics?.open_rate   ?? null,
        clicks:     r.statistics?.clicks      ?? null,
        click_rate: r.statistics?.click_rate  ?? null,
        revenue:    r.statistics?.attributed_revenue ?? r.statistics?.revenue ?? null,
      };
    }
    return kpiMap;
  } catch (e) {
    console.warn("getFlowKPIs error:", e);
    return {};
  }
}

interface FlowEmail {
  position: number;
  action_id: string;
  action_status: string;
  subject: string;
  preview_text: string;
  label: string;
}

async function getFlowEmails(
  flowId: string,
  kHeaders: Record<string, string>
): Promise<FlowEmail[]> {
  const actionsRes = await fetch(
    `https://a.klaviyo.com/api/flows/${flowId}/flow-actions/` +
      `?fields[flow-action]=action_type,status&page[size]=25`,
    { headers: kHeaders }
  );
  if (!actionsRes.ok) return [];

  const actionsJson = await actionsRes.json();
  const emailActions = (actionsJson.data || []).filter(
    (a: any) => a.attributes?.action_type === "send_email"
  );

  const emails: FlowEmail[] = [];
  for (let i = 0; i < Math.min(emailActions.length, 12); i++) {
    const action = emailActions[i];
    try {
      const msgRes = await fetch(
        `https://a.klaviyo.com/api/flow-actions/${action.id}/messages/` +
          `?fields[flow-message]=label,content&page[size]=1`,
        { headers: kHeaders }
      );
      if (msgRes.ok) {
        const msgJson = await msgRes.json();
        const msg = msgJson.data?.[0];
        if (msg) {
          emails.push({
            position:      i + 1,
            action_id:     action.id,
            action_status: action.attributes?.status || "unknown",
            subject:       msg.attributes?.content?.subject || msg.attributes?.label || "(nessun subject)",
            preview_text:  msg.attributes?.content?.preview_text || "",
            label:         msg.attributes?.label || `Email ${i + 1}`,
          });
        }
      }
    } catch {
      // skip
    }
    if (i < emailActions.length - 1) await new Promise((r) => setTimeout(r, 220));
  }
  return emails;
}

// ── main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { flow_id, timeframe } = body as { flow_id?: string; timeframe?: TimeframeKey };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsRows } = await supabase.from("brand_settings").select("*");
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { settings[r.key] = r.value; });

    const klaviyoKey = settings.klaviyo_api_key;
    if (!klaviyoKey) throw new Error("Klaviyo API key not configured");

    const kHeaders: Record<string, string> = {
      Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
      revision: "2024-10-15",
      Accept: "application/json",
    };

    // ── MODE 2: lazy-load emails for a specific flow ─────────────────────────
    if (flow_id) {
      const emails = await getFlowEmails(flow_id, kHeaders);
      return new Response(
        JSON.stringify({ emails }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MODE 1: all flows + KPIs ─────────────────────────────────────────────

    const activeTimeframe: TimeframeKey = timeframe || "last_30_days";

    // 1. Fetch flows (removed sort and trigger_type to avoid Klaviyo 400 errors)
    const flowsRes = await fetch(
      "https://a.klaviyo.com/api/flows/?page[size]=50&fields[flow]=name,status,created,updated,archived",
      { headers: kHeaders }
    );
    if (!flowsRes.ok) {
      const errBody = await flowsRes.text();
      console.error("Klaviyo flows error:", flowsRes.status, errBody);
      throw new Error(`Klaviyo flows error: ${flowsRes.status}`);
    }
    const flowsJson = await flowsRes.json();
    const flows: any[] = flowsJson.data || [];

    // 2. KPIs
    const conversionMetricId = await findPlacedOrderMetricId(kHeaders);
    const kpiMap = await getFlowKPIs(kHeaders, conversionMetricId, activeTimeframe);

    // 3. Enrich with action counts (batches of 3 to avoid 429 rate limits)
    async function fetchActions(flow: any) {
      const isActive = !flow.attributes?.archived &&
        (flow.attributes?.status === "live" || flow.attributes?.status === "draft" || flow.attributes?.status === "manual");
      if (!isActive) {
        return {
          id: flow.id, name: flow.attributes?.name || "Untitled",
          status: flow.attributes?.status || "unknown",
          trigger_type: flow.attributes?.trigger_type || "unknown",
          archived: flow.attributes?.archived || false,
          created: flow.attributes?.created, updated: flow.attributes?.updated,
          email_count: 0, sms_count: 0, total_actions: 0,
          kpi: kpiMap[flow.id] || null,
        };
      }
      try {
        const res = await fetch(
          `https://a.klaviyo.com/api/flows/${flow.id}/flow-actions/?page[size]=50`,
          { headers: kHeaders }
        );
        const json = res.ok ? await res.json() : { data: [] };
        const actions: any[] = json.data || [];
        return {
          id: flow.id, name: flow.attributes?.name || "Untitled",
          status: flow.attributes?.status || "unknown",
          trigger_type: flow.attributes?.trigger_type || "unknown",
          archived: false, created: flow.attributes?.created, updated: flow.attributes?.updated,
          email_count: actions.filter((a: any) => a.attributes?.action_type?.toLowerCase() === "send_email").length,
          sms_count: actions.filter((a: any) => a.attributes?.action_type?.toLowerCase() === "send_sms").length,
          total_actions: actions.length,
          kpi: kpiMap[flow.id] || null,
        };
      } catch {
        return {
          id: flow.id, name: flow.attributes?.name || "Untitled",
          status: flow.attributes?.status || "unknown",
          trigger_type: flow.attributes?.trigger_type || "unknown",
          archived: false, created: flow.attributes?.created, updated: flow.attributes?.updated,
          email_count: 0, sms_count: 0, total_actions: 0,
          kpi: kpiMap[flow.id] || null,
        };
      }
    }

    const enrichedFlows: any[] = [];
    const BATCH = 3;
    for (let i = 0; i < flows.length; i += BATCH) {
      const batch = flows.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(fetchActions));
      enrichedFlows.push(...results);
      if (i + BATCH < flows.length) await new Promise((r) => setTimeout(r, 400));
    }

    enrichedFlows.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });

    return new Response(
      JSON.stringify({ flows: enrichedFlows, timeframe: activeTimeframe }),
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
