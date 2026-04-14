import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract Notion page ID from various URL formats
function extractPageId(url: string): string | null {
  // Remove query params
  const clean = url.split("?")[0].split("#")[0];
  // Match the last 32-hex-char segment (with or without dashes)
  const match = clean.match(/([a-f0-9]{32})$/i) || clean.match(/([a-f0-9-]{36})$/i);
  if (!match) return null;
  const raw = match[1].replace(/-/g, "");
  if (raw.length !== 32) return null;
  // Format as UUID
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
}

// Recursively extract text from Notion block results
function extractTextFromBlocks(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const richTexts = block[block.type]?.rich_text || block[block.type]?.text || [];
    if (Array.isArray(richTexts)) {
      const line = richTexts.map((rt: any) => rt.plain_text || "").join("");
      if (line.trim()) lines.push(line.trim());
    }
    // Table rows
    if (block.type === "table_row" && block.table_row?.cells) {
      const row = block.table_row.cells.map((cell: any[]) =>
        cell.map((rt: any) => rt.plain_text || "").join("")
      ).join(" | ");
      if (row.trim()) lines.push(row.trim());
    }
    if (block.children) {
      lines.push(extractTextFromBlocks(block.children));
    }
  }
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notion_url } = await req.json();
    if (!notion_url) throw new Error("notion_url is required");

    const pageId = extractPageId(notion_url);
    if (!pageId) throw new Error("Could not extract Notion page ID from URL");

    console.log("Fetching Notion page:", pageId);

    // Use Notion's unofficial API to load page content (works for public pages)
    const loadRes = await fetch(`https://notion.so/api/v3/loadPageChunk`, {
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

    if (!loadRes.ok) {
      throw new Error(`Notion API returned ${loadRes.status}`);
    }

    const pageData = await loadRes.json();
    const recordMap = pageData?.recordMap || {};
    const blocks = recordMap?.block || {};

    // Extract all text content from blocks
    const textParts: string[] = [];
    for (const [, blockData] of Object.entries(blocks) as any) {
      const value = blockData?.value;
      if (!value) continue;
      
      // Get title/text from properties
      const props = value.properties;
      if (props) {
        for (const [, propVal] of Object.entries(props) as any) {
          if (Array.isArray(propVal)) {
            const text = propVal.map((segment: any) => {
              if (Array.isArray(segment)) return segment[0] || "";
              return "";
            }).join("");
            if (text.trim()) textParts.push(text.trim());
          }
        }
      }

      // Collection views (databases) - extract from collection data
      if (value.type === "collection_view" || value.type === "collection_view_page") {
        const collectionId = value.collection_id;
        const collection = recordMap?.collection?.[collectionId]?.value;
        if (collection?.name) {
          const name = collection.name.map((s: any) => s[0]).join("");
          textParts.push(`Collection: ${name}`);
        }
      }
    }

    // Also extract from collection rows if present
    const collections = recordMap?.collection || {};
    for (const [, collData] of Object.entries(collections) as any) {
      const schema = collData?.value?.schema;
      if (schema) {
        // We have a database schema, now look for rows in blocks
        for (const [, blockData] of Object.entries(blocks) as any) {
          const value = blockData?.value;
          if (!value?.properties || !value?.parent_id) continue;
          const row: string[] = [];
          for (const [propId, propVal] of Object.entries(value.properties) as any) {
            const colName = schema[propId]?.name || propId;
            const text = Array.isArray(propVal)
              ? propVal.map((s: any) => (Array.isArray(s) ? s[0] : "")).join("")
              : "";
            if (text.trim()) row.push(`${colName}: ${text.trim()}`);
          }
          if (row.length > 0) textParts.push(row.join(" | "));
        }
      }
    }

    const fullText = textParts.join("\n").slice(0, 10000);
    console.log("Extracted text length:", fullText.length);
    console.log("Text preview:", fullText.slice(0, 500));

    if (fullText.length < 20) {
      throw new Error("Could not extract text from the Notion page. Make sure it's publicly shared (Share → Publish to web).");
    }

    // Use AI to extract events
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
            content: `You extract marketing events from text. Return ONLY a JSON array of objects with these fields:
- "name": event name (string)
- "event_date": date in YYYY-MM-DD format (string)
- "event_type": one of "promo", "launch", "seasonal", "holiday", "content", "other" (string)
- "notes": any extra details (string or null)

If you find dates in relative format, use today's date ${new Date().toISOString().split("T")[0]} as reference.
If a date is ambiguous or missing the year, assume ${new Date().getFullYear()}.
Return ONLY the JSON array, no markdown, no explanation. If no events found, return [].`,
          },
          {
            role: "user",
            content: `Extract all marketing events with dates from this text:\n\n${fullText}`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new Error(`AI extraction failed (${aiRes.status}): ${errBody}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const events = JSON.parse(content);

    console.log("Events found:", events.length);

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
