import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import EmailEditor, { EditorRef, EmailEditorProps } from "react-email-editor";

export interface UnlayerEditorHandle {
  exportHtml: () => Promise<{ html: string; design: object }>;
  loadDesign: (design: object) => void;
}

interface Props {
  initialBody?: string;
  onReady?: () => void;
}

/**
 * Wraps react-email-editor (Unlayer) with a minimal easysea-branded config.
 * Exposes exportHtml() and loadDesign() via ref.
 */
const UnlayerEditor = forwardRef<UnlayerEditorHandle, Props>(
  ({ initialBody, onReady }, ref) => {
    const editorRef = useRef<EditorRef>(null);
    const readyFired = useRef(false);

    useImperativeHandle(ref, () => ({
      exportHtml: () =>
        new Promise((resolve) => {
          editorRef.current?.editor?.exportHtml((data: any) => {
            resolve({ html: data.html, design: data.design });
          });
        }),
      loadDesign: (design: object) => {
        editorRef.current?.editor?.loadDesign(design as any);
      },
    }));

    const handleReady = useCallback(() => {
      if (readyFired.current) return;
      readyFired.current = true;

      // If we have markdown body but no saved design, load a simple text block
      if (initialBody) {
        const simpleDesign = buildDesignFromMarkdown(initialBody);
        editorRef.current?.editor?.loadDesign(simpleDesign as any);
      }

      onReady?.();
    }, [initialBody, onReady]);

    const editorOptions: EmailEditorProps["options"] = {
      appearance: {
        theme: "modern_dark",
      },
      features: {
        textEditor: {
          spellChecker: false,
        },
      },
      tools: {
        // Enable all standard tools
      },
      mergeTags: {
        first_name: { name: "First Name", value: "{{first_name}}" },
        last_name: { name: "Last Name", value: "{{last_name}}" },
        email: { name: "Email", value: "{{email}}" },
        unsubscribe: { name: "Unsubscribe", value: "{{unsubscribe_url}}" },
      },
    };

    return (
      <div className="h-full w-full">
        <EmailEditor
          ref={editorRef}
          onReady={handleReady}
          options={editorOptions}
          minHeight="100%"
        />
      </div>
    );
  }
);

UnlayerEditor.displayName = "UnlayerEditor";
export default UnlayerEditor;

// ---------------------------------------------------------------------------
// Helper: turn markdown body into a minimal Unlayer design JSON
// ---------------------------------------------------------------------------
function buildDesignFromMarkdown(markdown: string): object {
  const rows: any[] = [];

  // Split by images vs text
  const parts = markdown.split(/(!\[[^\]]*\]\([^)]+\))/g);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      rows.push({
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "image",
                values: {
                  src: { url: imgMatch[2] },
                  alt: imgMatch[1] || "",
                  action: { name: "web", values: { href: "", target: "_blank" } },
                  containerPadding: "10px",
                  textAlign: "center",
                },
              },
            ],
          },
        ],
      });
    } else {
      // Convert markdown to basic HTML
      let html = trimmed
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>");
      html = `<p>${html}</p>`;

      // Check for CTA pattern → [text](url)
      const ctaMatch = trimmed.match(/→\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (ctaMatch) {
        rows.push({
          cells: [1],
          columns: [
            {
              contents: [
                {
                  type: "button",
                  values: {
                    text: ctaMatch[1],
                    href: ctaMatch[2],
                    buttonColors: { color: "#ffffff", backgroundColor: "#00C9B1" },
                    size: { autoWidth: false, width: "100%" },
                    padding: "12px 24px",
                    borderRadius: "6px",
                    containerPadding: "10px",
                    textAlign: "center",
                  },
                },
              ],
            },
          ],
        });
      } else {
        rows.push({
          cells: [1],
          columns: [
            {
              contents: [
                {
                  type: "text",
                  values: {
                    text: html,
                    containerPadding: "10px 20px",
                    textAlign: "left",
                    lineHeight: "160%",
                    _meta: { htmlID: `text_${rows.length}`, htmlClassNames: "body_text" },
                  },
                },
              ],
            },
          ],
        });
      }
    }
  }

  return {
    counters: { u_column: 1, u_row: rows.length },
    body: {
      rows,
      values: {
        backgroundColor: "#0A1628",
        contentWidth: "600px",
        fontFamily: { label: "Inter", value: "'Inter', sans-serif" },
        textColor: "#ffffff",
        linkStyle: {
          body: true,
          linkColor: "#00C9B1",
          linkUnderline: true,
        },
      },
    },
  };
}
