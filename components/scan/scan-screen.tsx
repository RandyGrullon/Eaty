"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Type,
  ClipboardPaste,
  Loader2,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pasteImageOrTextFromClipboard } from "@/lib/clipboard-scan";
import { cn } from "@/lib/utils";

interface ScanScreenProps {
  onScanFood: (imageFile?: File, foodName?: string) => void;
  onImageSelected?: (file: File) => void;
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
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-chart-2/[0.12] via-background to-primary/[0.08]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-10 pb-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Escanear
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Captura o describe
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Foto nítida del plato o nombre del menú: la IA estima calorías y
            macros al instante.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5 text-primary" aria-hidden />
              Visión
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-chart-2" aria-hidden />
              Texto
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleCameraCapture}
            className={cn(
              "group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-left shadow-md",
              "transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-inner">
              <Camera className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tomar foto</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Abre la cámara y encuadra el plato con buena luz.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleFileUpload}
            className={cn(
              "group relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-left shadow-md",
              "transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Upload className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-foreground">Subir imagen</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Galería o archivos; también puedes pegar con el botón de abajo.
              </p>
            </div>
          </button>
        </div>

        <Card className="border-primary/10 shadow-md shadow-primary/5">
          <CardContent className="space-y-4 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary shrink-0" aria-hidden />
              <Label htmlFor="scan-food-name" className="text-base font-semibold">
                O escribe el plato
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Nombre aproximado; cuanto más concreto, mejor la estimación.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Input
                id="scan-food-name"
                placeholder="Ej. bowl de salmón con arroz integral…"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="h-11 flex-1 text-base sm:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTextAnalysis();
                  }
                }}
              />
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-primary/25 bg-background hover:bg-primary/8"
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
                  className="h-11 min-w-[52px] rounded-xl px-4"
                  aria-label="Analizar por texto"
                >
                  <Type className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
