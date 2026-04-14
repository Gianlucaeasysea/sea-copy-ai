import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Search, Loader2, ImageIcon, Type, Download } from "lucide-react";

interface UnsplashPhoto {
  id: string;
  description: string;
  urls: { small: string; regular: string; full: string };
  user: { name: string; username: string };
  width: number;
  height: number;
}

interface HeroImageCreatorProps {
  open: boolean;
  onClose: () => void;
  onImageReady: (url: string) => void;
}

export default function HeroImageCreator({ open, onClose, onImageReady }: HeroImageCreatorProps) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);

  // Overlay settings
  const [overlayColor, setOverlayColor] = useState("#0A1628");
  const [overlayOpacity, setOverlayOpacity] = useState([0.35]);
  const [overlayText, setOverlayText] = useState("");
  const [textSize, setTextSize] = useState([42]);
  const [textColor, setTextColor] = useState("#ffffff");

  const [composing, setComposing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const searchPhotos = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-unsplash", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      setPhotos(data.photos || []);
      if ((data.photos || []).length === 0) toast.info("Nessuna foto trovata");
    } catch (e: any) {
      toast.error("Errore ricerca: " + (e?.message || "unknown"));
    } finally {
      setSearching(false);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPhoto) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 320;

      // Draw image
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      // Draw overlay
      const hex = overlayColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${overlayOpacity[0]})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text
      if (overlayText) {
        ctx.fillStyle = textColor;
        ctx.font = `700 ${textSize[0]}px Inter, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Word wrap
        const maxWidth = canvas.width - 60;
        const words = overlayText.split(" ");
        const lines: string[] = [];
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = textSize[0] * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
        });
      }
    };
    img.src = selectedPhoto.urls.regular;
  }, [selectedPhoto, overlayColor, overlayOpacity, overlayText, textSize, textColor]);

  useEffect(() => {
    if (selectedPhoto) {
      const timer = setTimeout(drawCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPhoto, drawCanvas]);

  const handleCompose = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setComposing(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.9);
      });

      const filename = `hero-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("hero-images")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("hero-images").getPublicUrl(data.path);
      onImageReady(urlData.publicUrl);
      toast.success("Immagine hero creata!");
      onClose();
    } catch (e: any) {
      toast.error("Errore upload: " + (e?.message || "unknown"));
    } finally {
      setComposing(false);
    }
  };

  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Crea immagine hero
          </DialogTitle>
        </DialogHeader>

        {!selectedPhoto ? (
          /* Search view */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cerca su Unsplash… es. ocean, sailing, summer"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPhotos()}
                />
              </div>
              <Button onClick={searchPhotos} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => handleSelectPhoto(photo)}
                      className="relative rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
                    >
                      <img
                        src={photo.urls.small}
                        alt={photo.description}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs">
                          📸 {photo.user.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !searching ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                  Cerca una foto su Unsplash per iniziare
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* Editor view */
          <div className="flex-1 flex flex-col sm:flex-row gap-4 min-h-0 overflow-y-auto">
            {/* Preview */}
            <div className="flex-1 min-w-0">
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border"
                style={{ aspectRatio: "600/320" }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                📸 {selectedPhoto.user.name} via Unsplash
              </p>
            </div>

            {/* Controls */}
            <div className="w-full sm:w-[220px] space-y-4 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setSelectedPhoto(null)}
              >
                ← Cambia foto
              </Button>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Type className="h-3 w-3" /> Testo overlay
                </Label>
                <Input
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="es. Summer Collection 2025"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Dimensione testo: {textSize[0]}px</Label>
                <Slider
                  value={textSize}
                  onValueChange={setTextSize}
                  min={18}
                  max={72}
                  step={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Colore testo</Label>
                <div className="flex gap-2">
                  {["#ffffff", "#0A1628", "#00C9B1", "#F5F5DC"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        textColor === c ? "ring-2 ring-primary ring-offset-2" : "border-border"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Opacità overlay: {Math.round(overlayOpacity[0] * 100)}%</Label>
                <Slider
                  value={overlayOpacity}
                  onValueChange={setOverlayOpacity}
                  min={0}
                  max={0.8}
                  step={0.05}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Colore overlay</Label>
                <div className="flex gap-2">
                  {["#0A1628", "#000000", "#1a365d", "#064e3b"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setOverlayColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        overlayColor === c ? "ring-2 ring-primary ring-offset-2" : "border-border"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPhoto && (
          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setSelectedPhoto(null)}>Annulla</Button>
            <Button onClick={handleCompose} disabled={composing}>
              <Download className="mr-1 h-3 w-3" />
              {composing ? "Caricamento…" : "Usa come hero"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
