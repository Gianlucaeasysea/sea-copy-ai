

# Plan: Branded HTML Email Template for Klaviyo Push

## Problem
Currently `push-to-klaviyo` sends raw markdown-converted HTML with no styling, no header, no product cards, no footer. The email in Klaviyo looks nothing like the preview in EasyCopy.

## Solution
Rebuild the `push-to-klaviyo` edge function to generate a fully styled, table-based HTML email that matches the `EmailPreview` component design, then use Klaviyo's **Template API** to create a template and assign it to the campaign message.

## Workflow (Klaviyo API)
1. **Create campaign** (as today)
2. **Create template** via `POST /api/templates` with the full branded HTML
3. **Assign template to campaign message** via `POST /api/campaign-message-assign-template/`

## HTML Email Template Design
Matches the existing `EmailPreview.tsx` exactly:

- **Header**: Dark navy bar (#0A1628) with "easysea®" logo left, "easysea.org" teal link right
- **Hero image**: Full-width if `hero_image_url` is set
- **Body**: Styled paragraphs with Inter font, headings, bold/italic, CTA buttons (navy background, white text, rounded)
- **Product cards**: Grid of product cards with image, title, price (with compare-at strikethrough in red), "Ordina ora →" / "Scopri →" CTA button
- **Footer**: Light gray background, address, unsubscribe link, easysea.org link in teal
- **Table-based layout** for email client compatibility (600px max width)

## Files Changed

### 1. `supabase/functions/push-to-klaviyo/index.ts`
- Replace the basic markdown-to-HTML converter with a full `buildBrandedHtml()` function that:
  - Generates table-based email HTML with inline styles
  - Renders hero image, styled body, product cards grid, footer
  - Handles products from `campaign.products_data` JSON
- Add Klaviyo Template API calls:
  - `POST /api/templates` → create template with branded HTML
  - `POST /api/campaign-message-assign-template/` → assign to campaign message
- Keep existing campaign creation logic, remove inline `body` from message content (template replaces it)

### 2. Deploy edge function

No frontend changes needed — the push button and flow remain the same.

