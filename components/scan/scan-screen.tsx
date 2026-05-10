"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Upload,
  Type,
  ClipboardPaste,
  Loader2,
  ScanLine,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pasteImageOrTextFromClipboard } from "@/lib/clipboard-scan";
import { cn } from "@/lib/utils";

interface ScanScreenProps {
  onScanFood: (imageFile?: File, foodName?: string) => void;
  onImageSelected?: (file: File) => void;
}

const scanCardClass =
  "group relative flex flex-col items-start gap-4 overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/40 p-6 text-left shadow-2xl shadow-black/[0.03] backdrop-blur-md transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-1 hover:bg-card active:scale-[0.98]";

function ScanModeCard({
  icon: Icon,
  badge,
  title,
  description,
  iconWrapClassName,
  onClick,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  iconWrapClassName: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={scanCardClass}>
      <div className="flex w-full items-start justify-between">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110 duration-300",
            iconWrapClassName
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <span className="rounded-full border border-border/40 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
          {badge}
        </span>
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-foreground">{title}</p>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground/80">
          {description}
        </p>
      </div>
      {/* Decorative gradient corner */}
      <div className="absolute -bottom-6 -right-6 h-12 w-12 bg-primary/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function ScanScreen({ onScanFood, onImageSelected }: ScanScreenProps) {
  const [foodName, setFoodName] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const routeImageFile = (file: File) => {
    if (onImageSelected) {
      onImageSelected(file);
    } else {
      onScanFood(file);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      routeImageFile(file);
    }
    e.target.value = "";
  };

  const handleTextAnalysis = () => {
    if (foodName.trim()) {
      onScanFood(undefined, foodName.trim());
      setFoodName("");
    }
  };

  const handlePasteFromClipboard = async () => {
    setPasteLoading(true);
    try {
      const result = await pasteImageOrTextFromClipboard();
      if (result.kind === "image") {
        routeImageFile(result.file);
        toast({
          title: "Imagen pegada",
          description: "Se usará como foto del plato para analizar.",
        });
      } else if (result.kind === "text") {
        setFoodName(result.text);
        toast({
          title: "Texto pegado",
          description: "Revisa el nombre y pulsa analizar cuando quieras.",
        });
      } else {
        toast({
          title: "Portapapeles vacío",
          description: "Copia una imagen o un texto e inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "No se pudo pegar",
        description:
          err instanceof Error ? err.message : "Permiso denegado o error.",
        variant: "destructive",
      });
    } finally {
      setPasteLoading(false);
    }
  };

  return (
    <div className="relative w-full min-w-0 max-w-full min-h-0 overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/[0.12] via-chart-2/[0.06] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 top-32 h-32 w-32 rounded-full bg-chart-2/20 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto box-border flex w-full min-w-0 max-w-lg flex-col gap-6 px-4 pb-32 pt-6 sm:px-5 sm:pt-8 md:pb-12">
        <header className="text-center sm:text-left">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-primary">
            Escanear
          </p>
          <h1 className="mt-1.5 font-sans text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            Tres formas de analizar
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:mx-0 sm:text-base">
            Foto con buena luz, imagen de galería o el nombre del plato. La IA
            estima calorías y macros al instante.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <ScanModeCard
            icon={Camera}
            badge="Rápido"
            title="Cámara"
            description="Encuadra el plato entero, evita sombras duras."
            iconWrapClassName="bg-primary text-primary-foreground"
            onClick={handleCameraCapture}
          />
          <ScanModeCard
            icon={Upload}
            badge="Galería"
            title="Subir imagen"
            description="Desde archivos; también puedes pegar con el portapapeles."
            iconWrapClassName="bg-muted text-foreground"
            onClick={handleFileUpload}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border/80" aria-hidden />
          <span className="shrink-0 font-medium">o solo con texto</span>
          <div className="h-px flex-1 bg-border/80" aria-hidden />
        </div>

        <Card className="overflow-hidden border-primary/20 bg-gradient-to-b from-card to-card/80 shadow-lg shadow-primary/5">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Type className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <Label
                    htmlFor="scan-food-name"
                    className="text-base font-semibold text-foreground"
                  >
                    Escribe el plato
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cuantas más pistas, mejor la estimación.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
              <Input
                id="scan-food-name"
                placeholder="Ej. ensalada César con pollo a la plancha…"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="h-12 w-full min-w-0 flex-1 rounded-xl border-border/80 bg-background/50 text-base sm:min-w-0 sm:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTextAnalysis();
                  }
                }}
              />
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-primary/25 bg-background"
                  onClick={handlePasteFromClipboard}
                  disabled={pasteLoading}
                  title="Pegar imagen o texto del portapapeles"
                  aria-label="Pegar del portapapeles"
                >
                  {pasteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardPaste className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleTextAnalysis}
                  disabled={!foodName.trim()}
                  className="h-12 min-w-[6.5rem] rounded-xl px-5"
                  aria-label="Analizar por texto"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Analizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ul className="flex min-w-0 max-w-full flex-col gap-2.5 break-words rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-1 sm:py-3">
          <li className="flex items-center gap-2">
            <ScanLine
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden
            />
            Foto: plano cenital o ligeramente inclinado.
          </li>
          <li className="hidden h-3 w-px bg-border/80 sm:block" aria-hidden />
          <li className="flex items-center gap-2">
            <Lightbulb
              className="h-3.5 w-3.5 shrink-0 text-chart-2"
              aria-hidden
            />
            Texto: incluye acompañamientos si aplica.
          </li>
        </ul>
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleImageChange}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />
    </div>
  );
}
