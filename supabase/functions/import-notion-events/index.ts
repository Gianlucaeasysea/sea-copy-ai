import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notion_url } = await req.json();
    if (!notion_url) throw new Error("notion_url is required");

    // Fetch the Notion page as HTML
    const res = await fetch(notion_url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
    });
    if (!res.ok) throw new Error(`Failed to fetch Notion page: ${res.status}`);
    const html = await res.text();

    // Strip HTML tags to get plain text
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Limit context

    if (text.length < 30) throw new Error("Could not extract text from the Notion page. Make sure it's publicly shared.");

    // Use AI to extract events
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai-gateway.lovable.dev/api/chat/completions", {
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

If you find dates in relative format (e.g. "next Monday"), use today's date ${new Date().toISOString().split("T")[0]} as reference.
If a date is ambiguous or missing the year, assume ${new Date().getFullYear()}.
Return ONLY the JSON array, no markdown, no explanation.`,
          },
          {
            role: "user",
            content: `Extract all marketing events with dates from this text:\n\n${text}`,
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
    
    // Clean markdown fences if present
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
