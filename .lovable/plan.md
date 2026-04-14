
# EasyCopy — AI Email Marketing Platform for easysea®

## Overview
A SaaS-style web app for generating email and WhatsApp marketing copy using AI, with a "correction memory" system that learns brand voice over time. Integrates with Klaviyo, Shopify, and Notion via edge functions.

## Design
- **Dark sidebar** (#0A1628) with white content area
- **Accent**: electric teal (#00C9B1)
- **Typography**: Inter for UI, monospace for copy preview
- **Layout**: Sidebar navigation with 5 sections: Dashboard, New Campaign, Corrections Library, Brand Settings

## Database (Supabase via Lovable Cloud)
- **campaigns** — stores all campaign data (name, type, language, framework, subject line, preview text, body, WhatsApp copy, status, linked Shopify product IDs, Notion URL, Klaviyo campaign ID)
- **corrections** — stores user corrections with original/corrected text, category, language, active toggle
- **brand_settings** — key-value store for brand voice, persona fallback, excluded tags, default language, API keys (Klaviyo, Shopify, Notion)

## Screens

### 1. Dashboard
- Campaign cards with name, type, language, status badge (Draft/Approved/Sent), date
- "New Campaign" CTA button
- Filters by type, language, status

### 2. New Campaign — Setup (step-by-step form)
- Campaign type selector (7 types)
- Language selector (Italian / English / Both)
- Email framework selector (8 frameworks: AIDA, PAS, SOAP Opera, etc.)
- Subject line tone selector (5 tones)
- Optional: Shopify product multi-select (fetched via edge function from Shopify Admin API, filtered by excluded tags)
- Optional: Notion URL or context notes
- Preview text variable with default

### 3. Campaign Editor (split view)
- **Left**: AI-generated copy (read-only, styled preview)
- **Right**: Editable rich text version
- **Top bar**: Subject line, preview text, Regenerate, Approve, Save to Notion, Push to Klaviyo
- **Correction tracking**: When text is edited, "Mark as Correction" button appears → modal shows diff, asks for category + note → saves to corrections table

### 4. Corrections Library
- Searchable/filterable table of all corrections
- Toggle active/inactive per correction
- Edit and delete functionality

### 5. Brand Settings
- Brand voice textarea, persona fallback, excluded tags, default language
- API key inputs for Klaviyo, Shopify, and Notion (stored securely as Supabase secrets)

## AI Generation (Lovable AI via Edge Function)
- Edge function builds dynamic system prompt: brand voice + active corrections as style rules + framework template + Shopify product data + Notion context
- Generates: subject line, preview text, structured email body, WhatsApp version
- **Streaming output** rendered progressively in the editor
- Model: `google/gemini-3-flash-preview`

## Edge Functions
1. **generate-copy** — AI generation with streaming, dynamic prompt assembly
2. **shopify-products** — Fetch products from Shopify Admin API, filter by excluded tags
3. **klaviyo-push** — Create campaign draft in Klaviyo via REST API
4. **notion-save** — Append copy to Notion page or create new page in the Calendario database

## Implementation Order
1. Set up Lovable Cloud, database tables, and brand settings seed data
2. Build sidebar layout + routing for all 5 screens
3. Build Dashboard with campaign CRUD
4. Build New Campaign setup form
5. Build AI generation edge function with streaming
6. Build Campaign Editor with split view and correction tracking
7. Build Corrections Library
8. Build Brand Settings page
9. Build Shopify product fetcher edge function + product selector UI
10. Build Klaviyo push edge function + integration
11. Build Notion save edge function + integration
