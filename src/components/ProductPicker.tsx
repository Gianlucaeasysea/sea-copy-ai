import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Check, Package, Layers } from "lucide-react";
import { toast } from "sonner";

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
  images: string[];
  price: string;
  compare_at_price: string | null;
  in_stock: boolean;
  inventory_quantity: number;
  url: string;
  product_type: string;
  tags: string;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
  url: string;
}

interface ProductPickerProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: ShopifyProduct[];
  onSelect: (products: ShopifyProduct[], collection: ShopifyCollection | null) => void;
  maxProducts?: number;
}

export default function ProductPicker({
  open,
  onClose,
  selectedProducts,
  onSelect,
  maxProducts = 6,
}: ProductPickerProps) {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<ShopifyProduct[]>(selectedProducts);
  const [selectedCollection, setSelectedCollection] = useState<ShopifyCollection | null>(null);

  useEffect(() => {
    if (open && products.length === 0) fetchData();
    if (open) setLocalSelected(selectedProducts);
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-shopify-products");
      if (error) throw error;
      setProducts(data.products || []);
      setCollections(data.collections || []);
    } catch (e: any) {
      toast.error("Errore Shopify: " + (e?.message || "controlla le credenziali in Brand Settings"));
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (product: ShopifyProduct) => {
    const isSelected = localSelected.some((p) => p.id === product.id);
    if (isSelected) {
      setLocalSelected((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      if (localSelected.length >= maxProducts) {
        toast.error(`Massimo ${maxProducts} prodotti selezionabili`);
        return;
      }
      setLocalSelected((prev) => [...prev, product]);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.product_type.toLowerCase().includes(q) ||
      p.tags.toLowerCase().includes(q)
    );
  });

  const formatPrice = (price: string) =>
    `€${parseFloat(price).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Scegli prodotti o collezione da Shopify</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="products" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Prodotti ({products.length})
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Layers className="mr-2 h-4 w-4" />
              Collezioni ({collections.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cerca prodotto, tipo, tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {localSelected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                {localSelected.map((p) => (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => toggleProduct(p)}
                  >
                    {p.title} ×
                  </Badge>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Caricamento prodotti Shopify…
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
                  {filteredProducts.map((product) => {
                    const isSelected = localSelected.some((p) => p.id === product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => toggleProduct(product)}
                        className={`relative rounded-lg border cursor-pointer transition-all overflow-hidden
                          ${isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50 hover:shadow-sm"}`}
                      >
                        <div className="aspect-square bg-muted relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          {!product.in_stock && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1">
                              Esaurito
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium leading-tight line-clamp-2">{product.title}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {product.compare_at_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.compare_at_price)}
                              </span>
                            )}
                            <span className={`text-xs font-semibold ${product.compare_at_price ? "text-red-600" : ""}`}>
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="collections" className="flex-1 overflow-y-auto mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {collections.map((col) => {
                const isSelected = selectedCollection?.id === col.id;
                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedCollection(isSelected ? null : col)}
                    className={`relative rounded-lg border cursor-pointer transition-all overflow-hidden
                      ${isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:shadow-sm"}`}
                  >
                    <div className="aspect-video bg-muted relative">
                      {col.image_url ? (
                        <img src={col.image_url} alt={col.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Layers className="h-8 w-8" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium">{col.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t shrink-0">
          <p className="text-sm text-muted-foreground">
            {localSelected.length > 0
              ? `${localSelected.length} prodott${localSelected.length === 1 ? "o" : "i"} selezionat${localSelected.length === 1 ? "o" : "i"}`
              : selectedCollection
              ? `Collezione: ${selectedCollection.title}`
              : "Nessuna selezione"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button
              onClick={() => { onSelect(localSelected, selectedCollection); onClose(); }}
              disabled={localSelected.length === 0 && !selectedCollection}
            >
              Conferma selezione
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
