import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractPageId(url: string): string | null {
  const clean = url.split("?")[0].split("#")[0];
  const match = clean.match(/([a-f0-9]{32})$/i);
  if (!match) return null;
  const raw = match[1];
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notion_url } = await req.json();
    if (!notion_url) throw new Error("notion_url is required");

    const pageId = extractPageId(notion_url);
    if (!pageId) throw new Error("Could not extract Notion page ID from URL");

    console.log("Page ID:", pageId);

    // 1. Load the page to find collection info
    const loadRes = await fetch("https://www.notion.so/api/v3/loadPageChunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: { id: pageId },
        limit: 100,
        cursor: { stack: [] },
        chunkNumber: 0,
        verticalColumns: false,
      }),
    });
    if (!loadRes.ok) throw new Error(`Notion loadPageChunk failed: ${loadRes.status}`);
    const loadData = await loadRes.json();
    const recordMap = loadData?.recordMap || {};

    // Find collection and view IDs
    const collectionIds = Object.keys(recordMap.collection || {});
    const viewIds = Object.keys(recordMap.collection_view || {});

    if (collectionIds.length > 0 && viewIds.length > 0) {
      // It's a database page — query rows
      const collectionId = collectionIds[0];
      const viewId = viewIds[0];
      const schema = recordMap.collection?.[collectionId]?.value?.value?.schema || {};

      console.log("Database found. Collection:", collectionId, "Schema keys:", Object.keys(schema).length);

      const queryRes = await fetch("https://www.notion.so/api/v3/queryCollection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: { id: collectionId },
          collectionView: { id: viewId },
          loader: {
            type: "reducer",
            reducers: {
              collection_group_results: { type: "results", limit: 200 },
            },
            searchQuery: "",
            userTimeZone: "Europe/Rome",
          },
        }),
      });
      if (!queryRes.ok) throw new Error(`Notion queryCollection failed: ${queryRes.status}`);
      const queryData = await queryRes.json();
      const blocks = queryData?.recordMap?.block || {};

      // Parse rows into events
      const events: any[] = [];
      for (const [, bdata] of Object.entries(blocks) as any) {
        const value = bdata?.value?.value;
        if (!value || value.type !== "page") continue;
        const props = value.properties || {};

        let name = "";
        let startDate = "";
        let endDate = "";
        let tags: string[] = [];
        let notes = "";

        for (const [pid, pval] of Object.entries(props) as any) {
          const col = schema[pid];
          if (!col) continue;
          const colType = col.type;
          const colName = (col.name || "").toLowerCase();

          if (colType === "title") {
            name = Array.isArray(pval) ? pval.map((s: any) => s[0]).join("") : "";
          } else if (colType === "date" && Array.isArray(pval)) {
            // Extract date from Notion's format: [["‣", [["d", {...}]]]]
            try {
              const dateInfo = pval[0]?.[1]?.[0]?.[1];
              if (dateInfo?.start_date) startDate = dateInfo.start_date;
              if (dateInfo?.end_date) endDate = dateInfo.end_date;
            } catch { /* skip */ }
          } else if (colType === "multi_select" || colType === "select") {
            const tagStr = Array.isArray(pval) ? pval.map((s: any) => s[0]).join("") : "";
            tags = tagStr.split(",").map((t: string) => t.trim()).filter(Boolean);
          } else if (colType === "text" || colName.includes("note") || colName.includes("desc")) {
            notes = Array.isArray(pval) ? pval.map((s: any) => s[0]).join("") : "";
          }
        }

        if (!name || !startDate) continue;

        // Determine event type from tags
        let eventType = "other";
        const tagLower = tags.join(" ").toLowerCase();
        if (tagLower.includes("promo") || tagLower.includes("sconto") || tagLower.includes("free")) eventType = "promo";
        else if (tagLower.includes("lancio") || tagLower.includes("launch")) eventType = "launch";
        else if (tagLower.includes("seasonal") || tagLower.includes("stagion")) eventType = "seasonal";
        else if (tagLower.includes("holiday") || tagLower.includes("festiv")) eventType = "holiday";
        else if (tagLower.includes("content") || tagLower.includes("mail") || tagLower.includes("whatsapp")) eventType = "content";

        events.push({
          name,
          event_date: startDate,
          event_type: eventType,
          notes: [tags.join(", "), notes, endDate ? `Fine: ${endDate}` : ""].filter(Boolean).join(" — ") || null,
        });

        // If it's a date range, also note end date is in the event
      }

      console.log("Events parsed:", events.length);

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: plain text page — use AI extraction
    const blocks = recordMap.block || {};
    const textParts: string[] = [];
    for (const [, bdata] of Object.entries(blocks) as any) {
      const value = bdata?.value?.value;
      if (!value?.properties) continue;
      for (const [, pval] of Object.entries(value.properties) as any) {
        if (Array.isArray(pval)) {
          const text = pval.map((s: any) => (Array.isArray(s) ? s[0] : "")).join("");
          if (text.trim()) textParts.push(text.trim());
        }
      }
    }
    const fullText = textParts.join("\n").slice(0, 10000);
    console.log("Fallback text extraction, length:", fullText.length);

    if (fullText.length < 20) {
      throw new Error("Nessun contenuto trovato. Assicurati che la pagina sia pubblica (Share → Publish to web).");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract marketing events. Return ONLY a JSON array: [{"name":"...","event_date":"YYYY-MM-DD","event_type":"promo|launch|seasonal|holiday|content|other","notes":"..."}]. No markdown. Today is ${new Date().toISOString().split("T")[0]}.`,
          },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI failed: ${aiRes.status}`);
    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const events = JSON.parse(content);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("import-notion-events error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
