import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "{{ … }}")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateBody(text: string, maxChars = 2500): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n[…]";
}

async function fetchAllKlaviyoPages(
  firstUrl: string,
  klaviyoKey: string
): Promise<any[]> {
  const allData: any[] = [];
  let nextUrl: string | null = firstUrl;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
        revision: "2024-10-15",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Klaviyo fetch failed (${res.status}): ${err}`);
    }

    const json = await res.json();
    allData.push(json);

    nextUrl = json.links?.next ?? null;
    if (nextUrl) await new Promise((r) => setTimeout(r, 450));
  }

  return allData;
}

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
    if (!klaviyoKey) throw new Error("Klaviyo API key not configured in Brand Settings");

    const today = new Date();
    const currentYear = today.getFullYear();
    const previousYear = currentYear - 1;
    const dateFrom = `${previousYear}-01-01T00:00:00Z`;
    const dateRangeStart = `${previousYear}-01-01`;
    const dateRangeEnd = today.toISOString().slice(0, 10);

    const firstUrl =
      "https://a.klaviyo.com/api/campaigns/" +
      `?filter=and(equals(messages.channel,'email'),equals(status,'Sent'),greater-or-equal(updated_at,'${dateFrom}'))` +
      "&sort=-updated_at" +
      "&page[size]=50" +
      "&include=campaign-messages" +
      "&fields[campaign]=name,status,updated_at" +
      "&fields[campaign-message]=content,channel,label";

    console.log("Starting Klaviyo full-history fetch from", dateFrom);
    const allPages = await fetchAllKlaviyoPages(firstUrl, klaviyoKey);

    const allCampaigns: any[] = allPages.flatMap((p) => p.data || []);
    const allIncluded: any[] = allPages.flatMap((p) => p.included || []);

    const messageMap: Record<string, any> = {};
    for (const item of allIncluded) {
      if (item.type === "campaign-message") {
        messageMap[item.id] = item.attributes;
      }
    }

    console.log(`Total campaigns found: ${allCampaigns.length}`);

    interface CampaignLight {
      name: string;
      updated_at: string;
      subject: string;
      preview_text: string;
      message_id: string | null;
      has_body: boolean;
      body_text: string;
    }

    const allCampaignData: CampaignLight[] = [];

    for (const campaign of allCampaigns) {
      const messageRefs = campaign.relationships?.["campaign-messages"]?.data || [];
      for (const ref of messageRefs) {
        const attrs = messageMap[ref.id];
        const content = attrs?.content || {};
        if (!content.subject) continue;

        const bodyRaw = content.body ? stripHtml(content.body) : "";

        allCampaignData.push({
          name: campaign.attributes?.name || "Untitled",
          updated_at: campaign.attributes?.updated_at || "",
          subject: content.subject || "",
          preview_text: content.preview_text || "",
          message_id: ref.id,
          has_body: bodyRaw.length > 100,
          body_text: bodyRaw ? truncateBody(bodyRaw) : "",
        });
      }
    }

    allCampaignData.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    const topForBodyAnalysis = allCampaignData.slice(0, 60);
    const missingBody = topForBodyAnalysis.filter((c) => !c.has_body && c.message_id);

    console.log(`Fetching body for ${missingBody.length} campaigns individually`);

    for (const campaign of missingBody) {
      if (!campaign.message_id) continue;
      try {
        const msgRes = await fetch(
          `https://a.klaviyo.com/api/campaign-messages/${campaign.message_id}/` +
            "?fields[campaign-message]=content",
          {
            headers: {
              Authorization: `Klaviyo-API-Key ${klaviyoKey}`,
              revision: "2024-10-15",
              Accept: "application/json",
            },
          }
        );
        if (msgRes.ok) {
          const msgJson = await msgRes.json();
          const body = msgJson.data?.attributes?.content?.body;
          if (body) {
            campaign.body_text = truncateBody(stripHtml(body));
            campaign.has_body = true;
          }
        }
        await new Promise((r) => setTimeout(r, 450));
      } catch (e) {
        console.warn("Could not fetch body for", campaign.message_id, e);
      }
    }

    if (allCampaignData.length === 0) {
      throw new Error(
        "No sent email campaigns found for the selected date range. " +
          "Check that your Klaviyo API key has campaigns:read scope."
      );
    }

    const allSubjectLines = allCampaignData
      .filter((c) => c.subject)
      .map((c, i) => `${i + 1}. [${c.updated_at.slice(0, 10)}] Subject: ${c.subject}${c.preview_text ? ` | Preview: ${c.preview_text}` : ""}`)
      .join("\n");

    const bodyCorpus = topForBodyAnalysis
      .filter((c) => c.has_body)
      .map(
        (c, i) =>
          `--- EMAIL ${i + 1}: "${c.name}" [${c.updated_at.slice(0, 10)}] ---\n` +
          `SUBJECT: ${c.subject}\n` +
          (c.preview_text ? `PREVIEW: ${c.preview_text}\n` : "") +
          `BODY:\n${c.body_text}`
      )
      .join("\n\n");

    const analysisPrompt = `You are a senior brand strategist and expert copywriter.
Below is the COMPLETE email marketing history of easysea®, an Italian sailing gear brand:
- Section A: ALL ${allCampaignData.length} subject lines sent in ${previousYear}–${currentYear}
- Section B: Full content of the ${topForBodyAnalysis.filter((c) => c.has_body).length} most recent campaigns

Analyze everything with extreme depth. Your output is a brand style guide that will be
injected verbatim into an AI prompt to generate future copy. It must make the AI write
EXACTLY like easysea® — not approximately, not inspired by, EXACTLY.

Rules:
- NEVER use generic adjectives without evidence from the text
- ALWAYS support every claim with verbatim quotes from the corpus
- Be specific about lengths, structures, punctuation, word choice
- Note patterns that appear in multiple campaigns (recurring = intentional)
- Note what is ABSENT (what they never do is as important as what they do)

Output a single markdown document with these exact sections:

## 1. Subject Line Patterns
## 2. Preview Text Patterns
## 3. Opening Hook Patterns
## 4. Body Structure & Rhythm
## 5. CTA Patterns
## 6. Product Description Style
## 7. Vocabulary Bank
## 8. Tone & Personality Fingerprint
## 9. Emoji & Visual Tone
## 10. The 7 Non-Obvious Style Rules

---

SECTION A — ALL SUBJECT LINES & PREVIEWS (${allCampaignData.length} campaigns, ${previousYear}–${currentYear}):

${allSubjectLines}

---

SECTION B — FULL EMAIL CONTENT (${topForBodyAnalysis.filter((c) => c.has_body).length} most recent campaigns):

${bodyCorpus}`;

    const claudeApiKey = settings.claude_api_key;
    let analysisText = "";

    if (claudeApiKey) {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 6000,
          system:
            "You are a senior brand strategist. Output ONLY the requested markdown document. " +
            "No preamble, no closing remarks, no meta-commentary.",
          messages: [{ role: "user", content: analysisPrompt }],
        }),
      });
      if (!aiRes.ok) throw new Error(`Claude API error: ${aiRes.status} — ${await aiRes.text()}`);
      const aiJson = await aiRes.json();
      analysisText = aiJson.content?.[0]?.text || "";
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("No AI key available — add Claude API key or ensure Lovable key is set");
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a senior brand strategist. Output ONLY the requested markdown document.",
            },
            { role: "user", content: analysisPrompt },
          ],
        }),
      });
      if (!aiRes.ok) throw new Error(`Gemini error: ${aiRes.status}`);
      const aiJson = await aiRes.json();
      analysisText = aiJson.choices?.[0]?.message?.content || "";
    }

    if (!analysisText) throw new Error("AI returned empty analysis");

    const ctaRegex = /→[^\n]{3,60}|SHOP[^\n]{0,50}|DISCOVER[^\n]{0,50}|SCOPRI[^\n]{0,50}|ORDINA[^\n]{0,50}|ORDER[^\n]{0,50}/gi;
    const ctaExamples = [
      ...new Set(
        topForBodyAnalysis
          .flatMap((c) => [...(c.body_text.match(ctaRegex) || [])])
          .map((s) => s.trim())
          .filter((s) => s.length < 80)
      ),
    ].slice(0, 20);

    const openerExamples = allCampaignData
      .map((c) => {
        const first = c.body_text.split("\n").find((l) => l.trim().length > 20);
        return first?.trim() ?? null;
      })
      .filter(Boolean)
      .slice(0, 15) as string[];

    const subjectExamples = allCampaignData
      .filter((c) => c.subject)
      .map((c) => c.subject)
      .slice(0, 50);

    await supabase
      .from("brand_voice_analysis")
      .update({ is_active: false })
      .eq("is_active", true);

    const { data: saved, error: saveError } = await supabase
      .from("brand_voice_analysis")
      .insert({
        campaigns_analyzed: allCampaignData.length,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        analysis_document: analysisText,
        subject_examples: subjectExamples,
        opener_examples: openerExamples,
        cta_examples: ctaExamples,
        is_active: true,
      })
      .select()
      .single();

    if (saveError) throw new Error("Failed to save analysis: " + saveError.message);

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_analyzed: allCampaignData.length,
        date_range: `${dateRangeStart} → ${dateRangeEnd}`,
        analysis_id: saved.id,
        preview: analysisText.slice(0, 500) + "…",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-klaviyo-voice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
