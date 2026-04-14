import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Info, ShoppingBag, X } from "lucide-react";
import ProductPicker, { ShopifyProduct, ShopifyCollection } from "@/components/ProductPicker";
import ProductElementPicker, { ProductElements } from "@/components/ProductElementPicker";

const FRAMEWORK_CONTEXT: Record<string, { tagline: string; whenToUse: string }> = {
  "AIDA": { tagline: "Il framework classico. Funziona sempre.", whenToUse: "Lancio prodotto, promo, newsletter con focus chiaro" },
  "PAS": { tagline: "Il più potente per email emotive.", whenToUse: "Problemi specifici, riattivazione, email a freddo" },
  "SOAP Opera Sequence": { tagline: "Non è una mail — è una serie di 4–7 email.", whenToUse: "Welcome sequence, lancio importante, brand storytelling" },
  "Before-After-Bridge": { tagline: "Mostra la trasformazione. Semplice, efficace.", whenToUse: "Prodotti con beneficio visibile, testimonial" },
  "4 Ps": { tagline: "Struttura da direct response. Ottima per promo con scadenza.", whenToUse: "Weekend deals, Black Friday, offerte a tempo" },
  "StoryBrand": { tagline: "Il cliente è l'eroe. Tu sei la guida.", whenToUse: "Welcome, onboarding, brand storytelling" },
  "Feature-Benefit-Proof": { tagline: "Per prodotti tecnici. La struttura più onesta.", whenToUse: "Lancio prodotto tecnico, comparativi, clienti caldi" },
  "Plain Broadcast": { tagline: "Nessun framework. Solo comunicazione diretta.", whenToUse: "Aggiornamenti, annunci rapidi, newsletter leggere" },
  "Welcome Series": { tagline: "5 email di onboarding. Trasforma un lead freddo in cliente.", whenToUse: "Nuovi iscritti newsletter" },
  "Launch Sequence": { tagline: "4 email dal teaser al last call.", whenToUse: "Lancio prodotto nuovo o di ritorno" },
  "Re-engagement": { tagline: "3 email per riattivare chi non compra da 90+ giorni.", whenToUse: "Lista fredda, segmento dormiente" },
  "Post-Purchase": { tagline: "3 email post-acquisto. Rafforza la decisione, riduce i resi.", whenToUse: "Dopo ogni ordine" },
};

const FRAMEWORKS = [
  // Single email
  { value: "AIDA",                  label: "AIDA",                  emails: 1 },
  { value: "PAS",                   label: "PAS",                   emails: 1 },
  { value: "Before-After-Bridge",   label: "Before-After-Bridge",   emails: 1 },
  { value: "4 Ps",                  label: "4 Ps",                  emails: 1 },
  { value: "StoryBrand",            label: "StoryBrand",            emails: 1 },
  { value: "Feature-Benefit-Proof", label: "Feature-Benefit-Proof", emails: 1 },
  { value: "Plain Broadcast",       label: "Plain Broadcast",       emails: 1 },
  // Multi-email sequences
  { value: "SOAP Opera Sequence",   label: "SOAP Opera Sequence",   emails: 5 },
  { value: "Welcome Series",        label: "Welcome Series",        emails: 5 },
  { value: "Launch Sequence",       label: "Launch Sequence",       emails: 4 },
  { value: "Re-engagement",         label: "Re-engagement",         emails: 3 },
  { value: "Post-Purchase",         label: "Post-Purchase",         emails: 3 },
];

const campaignTypes = [
  "Product Launch", "Promo Weekend", "Newsletter", "Storytelling",
  "Abandoned Cart", "Welcome Series", "Announcement",
];

const tones = ["Curiosity", "Urgency", "Benefit-led", "Story hook", "Direct"];

export default function NewCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    type: "Product Launch",
    language: "it",
    framework: "AIDA",
    subject_tone: "Curiosity",
    context_notes: "",
    preview_text: "{{ person.first_name|title|default:'Sea Lover' }}",
  });
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ShopifyProduct[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<ShopifyCollection | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [productElements, setProductElements] = useState<Record<string, ProductElements>>({});
  const [elementPickerProduct, setElementPickerProduct] = useState<ShopifyProduct | null>(null);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("campaigns").insert({
      name: form.name,
      type: form.type,
      language: form.language,
      framework: form.framework,
      subject_tone: form.subject_tone,
      context_notes: form.context_notes || null,
      preview_text: form.preview_text,
      status: "draft",
      products_data: selectedProducts.length > 0
        ? selectedProducts.map((p) => ({ ...p, elements: productElements[p.id] || null })) as any
        : null,
      collection_name: selectedCollection?.title || null,
      hero_image_url: heroImageUrl || selectedProducts[0]?.image_url || null,
    } as any).select().single();

    if (error) {
      toast.error("Failed to create campaign");
      setLoading(false);
      return;
    }
    toast.success("Campaign created!");
    navigate(`/campaign/${data.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-muted-foreground text-sm mt-1">Step {step} of 2</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input placeholder="e.g. Summer Regatta Collection Launch" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{campaignTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => update("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Framework</Label>
                <Select value={form.framework} onValueChange={(v) => update("framework", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Singola email</div>
                    {FRAMEWORKS.filter((f) => f.emails === 1).map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium mt-1 border-t pt-2">Sequenze multi-email</div>
                    {FRAMEWORKS.filter((f) => f.emails > 1).map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span className="flex items-center gap-2">
                          {f.label}
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">
                            {f.emails} email
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {FRAMEWORK_CONTEXT[form.framework] && (
                  <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md border border-dashed">
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{FRAMEWORK_CONTEXT[form.framework].tagline}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ideale per: {FRAMEWORK_CONTEXT[form.framework].whenToUse}
                      </p>
                    </div>
                    <Link to="/guide" className="text-xs text-primary underline shrink-0">
                      Guida →
                    </Link>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Subject Line Tone</Label>
                <Select value={form.subject_tone} onValueChange={(v) => update("subject_tone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Product / Collection Picker */}
            <div className="space-y-2">
              <Label>Prodotti o Collezione in evidenza</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setPickerOpen(true)}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {selectedProducts.length > 0
                  ? `${selectedProducts.length} prodotti selezionati`
                  : selectedCollection
                  ? `Collezione: ${selectedCollection.title}`
                  : "Scegli da Shopify…"}
              </Button>

              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.title} className="h-6 w-6 rounded object-cover" />
                      )}
                      <span className="text-xs">{p.title}</span>
                      <button
                        onClick={() => setElementPickerProduct(p)}
                        className="text-xs text-primary underline ml-1"
                      >
                        {productElements[p.id] ? "✓ elementi" : "dettagli"}
                      </button>
                      <button
                        onClick={() => setSelectedProducts((prev) => prev.filter((x) => x.id !== p.id))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {elementPickerProduct && (
                <ProductElementPicker
                  open={!!elementPickerProduct}
                  onClose={() => setElementPickerProduct(null)}
                  productId={elementPickerProduct.id}
                  productTitle={elementPickerProduct.title}
                  onConfirm={(elements) => {
                    setProductElements((prev) => ({ ...prev, [elementPickerProduct.id]: elements }));
                  }}
                />
              )}

              <ProductPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                selectedProducts={selectedProducts}
                onSelect={(products, collection) => {
                  setSelectedProducts(products);
                  setSelectedCollection(collection);
                }}
              />
            </div>

            {/* Hero image URL */}
            <div className="space-y-2">
              <Label>Immagine hero (opzionale)</Label>
              <Input
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://cdn.shopify.com/... oppure lascia vuoto"
              />
              <p className="text-xs text-muted-foreground">
                URL immagine per la sezione hero dell'email. Se vuoto usa la prima immagine del prodotto principale.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preview Text Variable</Label>
              <Input value={form.preview_text} onChange={(e) => update("preview_text", e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Context Notes (optional)</Label>
              <Textarea placeholder="Paste Notion page URL, product details, or any background context..." value={form.context_notes} onChange={(e) => update("context_notes", e.target.value)} rows={4} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create & Generate Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
