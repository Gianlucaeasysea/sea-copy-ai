import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImageIcon, ListChecks, Wrench, Tag } from "lucide-react";
import { toast } from "sonner";

export interface ProductElements {
  product_id: string;
  product_title: string;
  include_description: boolean;
  include_features: string[];
  include_specs: string[];
  include_images: string[];
  include_variants_info: boolean;
  include_price: boolean;
  include_compare_price: boolean;
  description_text: string;
  all_features: string[];
  all_specs: Array<{ key: string; label: string; value: string }>;
  all_images: Array<{ src: string; alt: string; is_primary: boolean }>;
  url: string;
}

interface ProductElementPickerProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  onConfirm: (elements: ProductElements) => void;
}

export default function ProductElementPicker({
  open, onClose, productId, productTitle, onConfirm,
}: ProductElementPickerProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const [includeDescription, setIncludeDescription] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [includeVariants, setIncludeVariants] = useState(false);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeComparePrice, setIncludeComparePrice] = useState(true);

  useEffect(() => {
    if (open && !details) fetchDetails();
  }, [open]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-product-details", {
        body: { product_id: productId },
      });
      if (error) throw error;
      setDetails(data);
      setSelectedFeatures(data.features || []);
      setSelectedImages(data.images?.[0]?.src ? [data.images[0].src] : []);
      setSelectedSpecs((data.specs || []).map((s: any) => s.key));
    } catch (e: any) {
      toast.error("Errore caricamento dettagli: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (f: string) =>
    setSelectedFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const toggleSpec = (key: string) =>
    setSelectedSpecs((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);

  const toggleImage = (src: string) =>
    setSelectedImages((prev) => prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src]);

  const handleConfirm = () => {
    if (!details) return;
    onConfirm({
      product_id: productId,
      product_title: productTitle,
      include_description: includeDescription,
      include_features: selectedFeatures,
      include_specs: selectedSpecs.map((k) => {
        const spec = details.specs.find((s: any) => s.key === k);
        return spec ? `${spec.label}: ${spec.value}` : k;
      }),
      include_images: selectedImages,
      include_variants_info: includeVariants,
      include_price: includePrice,
      include_compare_price: includeComparePrice,
      description_text: details.description_text,
      all_features: details.features,
      all_specs: details.specs,
      all_images: details.images,
      url: details.url,
    });
    onClose();
  };

  const selectedCount = [
    includeDescription,
    selectedFeatures.length > 0,
    selectedSpecs.length > 0,
    selectedImages.length > 0,
    includeVariants,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Elementi da includere — {productTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Caricamento product page da Shopify…</span>
          </div>
        ) : details ? (
          <Tabs defaultValue="features" className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0">
              <TabsTrigger value="features">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Features ({details.features?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="specs">
                <Wrench className="mr-1.5 h-3.5 w-3.5" />
                Specs ({details.specs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                Immagini ({details.images?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="other">Altro</TabsTrigger>
            </TabsList>

            {/* FEATURES */}
            <TabsContent value="features" className="flex-1 overflow-y-auto space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Bullet point e frasi chiave estratti dalla product page
                </p>
                <Button variant="ghost" size="sm" onClick={() =>
                  setSelectedFeatures(
                    selectedFeatures.length === details.features.length ? [] : [...details.features]
                  )}>
                  {selectedFeatures.length === details.features.length ? "Deseleziona tutto" : "Seleziona tutto"}
                </Button>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Checkbox
                  id="include-description"
                  checked={includeDescription}
                  onCheckedChange={(v) => setIncludeDescription(!!v)}
                />
                <Label htmlFor="include-description" className="cursor-pointer flex-1">
                  <span className="font-medium">Descrizione completa</span>
                  <span className="text-xs text-muted-foreground block mt-0.5 line-clamp-2">
                    {details.description_text?.slice(0, 120)}…
                  </span>
                </Label>
              </div>

              <div className="space-y-2">
                {(details.features || []).map((feature: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={`feature-${i}`}
                      checked={selectedFeatures.includes(feature)}
                      onCheckedChange={() => toggleFeature(feature)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={`feature-${i}`} className="text-sm cursor-pointer leading-snug">
                      {feature}
                    </Label>
                  </div>
                ))}
                {details.features?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessun bullet point trovato nella product page.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* SPECS */}
            <TabsContent value="specs" className="flex-1 overflow-y-auto space-y-2 mt-3">
              <p className="text-xs text-muted-foreground mb-3">Metafields tecnici da Shopify</p>
              {(details.specs || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun metafield trovato per questo prodotto.
                </p>
              ) : (
                (details.specs || []).map((spec: any) => (
                  <div key={spec.key} className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={`spec-${spec.key}`}
                      checked={selectedSpecs.includes(spec.key)}
                      onCheckedChange={() => toggleSpec(spec.key)}
                    />
                    <Label htmlFor={`spec-${spec.key}`} className="cursor-pointer flex-1">
                      <span className="text-sm font-medium">{spec.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{spec.value}</span>
                    </Label>
                    <Badge variant="outline" className="text-xs shrink-0">{spec.namespace}</Badge>
                  </div>
                ))
              )}
            </TabsContent>

            {/* IMAGES */}
            <TabsContent value="images" className="flex-1 overflow-y-auto mt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Seleziona le immagini da richiamare nella mail (verranno incluse nel prompt AI)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(details.images || []).map((img: any) => (
                  <div
                    key={img.src}
                    onClick={() => toggleImage(img.src)}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                      ${selectedImages.includes(img.src)
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/30"}`}
                  >
                    <img src={img.src} alt={img.alt} className="w-full aspect-square object-cover" />
                    {img.is_primary && (
                      <Badge className="absolute top-1 left-1 text-xs">Principale</Badge>
                    )}
                    {selectedImages.includes(img.src) && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* OTHER */}
            <TabsContent value="other" className="mt-3 space-y-3">
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Checkbox id="include-price" checked={includePrice} onCheckedChange={(v) => setIncludePrice(!!v)} />
                <Label htmlFor="include-price" className="cursor-pointer">Includi prezzo nella mail</Label>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Checkbox id="include-compare-price" checked={includeComparePrice} onCheckedChange={(v) => setIncludeComparePrice(!!v)} />
                <Label htmlFor="include-compare-price" className="cursor-pointer">
                  Includi prezzo barrato (compare_at_price) se presente
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Checkbox id="include-variants" checked={includeVariants} onCheckedChange={(v) => setIncludeVariants(!!v)} />
                <Label htmlFor="include-variants" className="cursor-pointer">
                  Includi varianti disponibili ({details.variants?.length || 0} varianti)
                </Label>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        <DialogFooter className="shrink-0 border-t pt-4">
          <p className="text-xs text-muted-foreground mr-auto">
            {selectedCount} categoria/e di elementi selezionata/e
          </p>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleConfirm} disabled={!details}>Conferma elementi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
