import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Search, Loader2 } from "lucide-react";

interface UnsplashPhoto {
  id: string;
  description: string;
  urls: { small: string; regular: string };
  user: { name: string; username: string };
}

interface ShopifyImage {
  url: string;
  title: string;
}

interface ImageInserterProps {
  open: boolean;
  onClose: () => void;
  onInsert: (markdownImg: string) => void;
}

export default function ImageInserter({ open, onClose, onInsert }: ImageInserterProps) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [shopifyImages, setShopifyImages] = useState<ShopifyImage[]>([]);
  const [loadingShopify, setLoadingShopify] = useState(false);
  const [shopifyFilter, setShopifyFilter] = useState("");

  // Fetch all Shopify product images when dialog opens
  useEffect(() => {
    if (!open || shopifyImages.length > 0) return;
    setLoadingShopify(true);
    supabase.functions.invoke("get-shopify-products")
      .then(({ data }) => {
        const images: ShopifyImage[] = [];
        for (const p of data?.products || []) {
          for (const imgUrl of p.images || []) {
            images.push({ url: imgUrl, title: p.title });
          }
        }
        setShopifyImages(images);
      })
      .catch(() => {})
      .finally(() => setLoadingShopify(false));
  }, [open]);

  const searchUnsplash = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-unsplash", {
        body: { query, per_page: 12 },
      });
      if (error) throw error;
      setPhotos(data?.photos || []);
    } catch {
      setPhotos([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (url: string, alt: string) => {
    onInsert(`\n\n![${alt}](${url})\n\n`);
    onClose();
    setPhotos([]);
    setQuery("");
  };

  const handleUrlInsert = () => {
    if (!urlInput.trim()) return;
    onInsert(`\n\n![image](${urlInput.trim()})\n\n`);
    onClose();
    setUrlInput("");
  };

  const filteredShopify = shopifyFilter
    ? shopifyImages.filter((img) => img.title.toLowerCase().includes(shopifyFilter.toLowerCase()))
    : shopifyImages;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Inserisci immagine
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="shopify" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="shopify">Shopify</TabsTrigger>
            <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
            <TabsTrigger value="url">URL diretto</TabsTrigger>
          </TabsList>

          <TabsContent value="shopify" className="flex-1 overflow-hidden flex flex-col mt-3">
            <div className="shrink-0 mb-3">
              <Input
                value={shopifyFilter}
                onChange={(e) => setShopifyFilter(e.target.value)}
                placeholder="Filtra per nome prodotto..."
                className="w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingShopify ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Caricamento immagini Shopify...</span>
                </div>
              ) : filteredShopify.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {filteredShopify.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(img.url, img.title)}
                      className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors aspect-square"
                    >
                      <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{img.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nessuna immagine trovata</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="unsplash" className="flex-1 overflow-hidden flex flex-col mt-3">
            <div className="flex gap-2 shrink-0 mb-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
                placeholder="Cerca su Unsplash... (es. sailing, ocean, boat)"
                className="flex-1"
              />
              <Button onClick={searchUnsplash} disabled={searching} size="sm">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p.urls.regular, p.description || "unsplash image")}
                      className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors aspect-[4/3]"
                    >
                      <img src={p.urls.small} alt={p.description} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-[10px]">📷 {p.user.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searching ? "Cercando..." : "Cerca immagini su Unsplash"}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-3">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Incolla un URL di un'immagine esterna:</p>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlInsert()}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button onClick={handleUrlInsert} disabled={!urlInput.trim()} size="sm">
                  Inserisci
                </Button>
              </div>
              {urlInput.trim() && (
                <div className="rounded-lg border overflow-hidden max-w-[300px]">
                  <img src={urlInput} alt="preview" className="w-full" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
