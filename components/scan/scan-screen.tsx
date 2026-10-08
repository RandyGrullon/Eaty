"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  ClipboardPaste,
  Loader2,
  ScanLine,
  Lightbulb,
  Barcode,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { pasteImageOrTextFromClipboard } from "@/lib/clipboard-scan";
import { motion, AnimatePresence } from "framer-motion";
import { prepareImageForGroq } from "@/lib/image-for-llm";
import { analyzeFood } from "@/lib/groq";
import { BarcodeScanner } from "./barcode-scanner";
import { LiveScanner } from "./live-scanner";
import { ScanModeCard } from "./scan-mode-card";
import { TextAnalysisCard } from "./text-analysis-card";
import { getProductByBarcode } from "@/lib/barcode";
import { PageHeader } from "@/components/app/page-header";
import { barcodeProductToMealData } from "@/lib/barcode-to-meal";

interface ScanScreenProps {
  onScanFood: (imageFile?: File, foodName?: string, description?: string, fullData?: any) => void;
  onImageSelected?: (file: File) => void;
}

export function ScanScreen({ onScanFood, onImageSelected }: ScanScreenProps) {
  const [foodName, setFoodName] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isLiveScannerOpen, setIsLiveScannerOpen] = useState(false);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImageAnalysisInternal = async (imageFile: File) => {
    const { base64WithoutPrefix, mimeType } = await prepareImageForGroq(imageFile);
    const idToken = user ? await user.getIdToken() : "";
    return analyzeFood(
      { imageBase64: base64WithoutPrefix, imageMimeType: mimeType },
      idToken
    );
  };

  const routeImageFile = (file: File) => {
    if (onImageSelected) {
      onImageSelected(file);
    } else {
      onScanFood(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      routeImageFile(file);
      toast({
        title: "Imagen detectada",
        description: "Analizando la foto que has soltado.",
      });
    } else if (file) {
      toast({
        title: "Archivo no válido",
        description: "Por favor, suelta una imagen (JPG, PNG, etc.)",
        variant: "destructive",
      });
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleBarcodeScan = async (barcode: string) => {
    setIsBarcodeOpen(false);
    setIsBarcodeLoading(true);
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        toast({
          title: "Producto encontrado",
          description: product.brand
            ? `${product.foodName} — ${product.brand}`
            : product.foodName,
        });
        onScanFood(undefined, undefined, undefined, barcodeProductToMealData(product));
      } else {
        toast({
          title: "Producto no encontrado",
          description: "Intenta sacarle una foto o escribir el nombre.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error al buscar producto",
        description: "Revisa tu conexión.",
        variant: "destructive",
      });
    } finally {
      setIsBarcodeLoading(false);
    }
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-full w-full min-w-0 max-w-full overflow-x-hidden bg-background pb-32 md:pb-12"
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-background/85 p-4"
          >
            <div className="surface flex w-full max-w-sm flex-col items-center gap-3 border-2 border-dashed border-primary p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </span>
              <p className="text-lg font-semibold">Suelta para analizar</p>
              <p className="text-sm text-muted-foreground">Arrastra cualquier foto de comida aquí.</p>
            </div>
          </motion.div>
        )}
        {isBarcodeOpen && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setIsBarcodeOpen(false)}
          />
        )}
        {isLiveScannerOpen && (
          <LiveScanner
            analyzeFrame={async (file) => {
              try {
                return await handleImageAnalysisInternal(file);
              } catch (e) {
                // El loop del scanner maneja el reintento; lanzamos para que cuente como error.
                throw e;
              }
            }}
            onConfirm={(result) => {
              setIsLiveScannerOpen(false);
              onScanFood(undefined, undefined, undefined, result);
            }}
            onClose={() => setIsLiveScannerOpen(false)}
          />
        )}
      </AnimatePresence>

      {isBarcodeLoading && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/85 p-4">
          <div className="surface flex flex-col items-center gap-3 px-8 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Buscando producto…</p>
          </div>
        </div>
      )}

      <PageHeader title="Registrar comida" subtitle="Foto, código de barras o texto: elige cómo." />

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <section className="min-w-0 lg:col-span-7">
            <h2 className="sr-only">Modos de análisis</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ScanModeCard
                icon={ScanLine}
                badge="En vivo"
                title="Escáner en vivo"
                description="Apunta al plato y la IA lo analiza al momento."
                iconWrapClassName="bg-primary text-primary-foreground"
                onClick={() => setIsLiveScannerOpen(true)}
                index={0}
              />
              <ScanModeCard
                icon={Camera}
                badge="Foto"
                title="Cámara"
                description="Haz una foto con la cámara del sistema."
                iconWrapClassName="bg-primary/10 text-primary"
                onClick={handleCameraCapture}
                index={1}
              />
              <ScanModeCard
                icon={Barcode}
                badge="UPC/EAN"
                title="Código de barras"
                description="Escanea un paquete para ver su nutrición."
                iconWrapClassName="bg-carbs/15 text-carbs"
                onClick={() => setIsBarcodeOpen(true)}
                index={2}
              />
              <ScanModeCard
                icon={QrCode}
                badge="QR"
                title="Código QR"
                description="Analiza productos mediante su código QR."
                iconWrapClassName="bg-fat/15 text-fat"
                onClick={() => setIsBarcodeOpen(true)}
                index={3}
              />
              <ScanModeCard
                icon={Upload}
                badge="Galería"
                title="Subir imagen"
                description="Elige una foto de tu galería o archivos."
                iconWrapClassName="bg-muted text-foreground"
                onClick={handleFileUpload}
                index={4}
              />
              <ScanModeCard
                icon={ClipboardPaste}
                badge="Imagen o texto"
                title="Pegar"
                description="Pega una imagen o un texto copiado."
                iconWrapClassName="bg-accent text-accent-foreground"
                onClick={handlePasteFromClipboard}
                index={5}
              />
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-4 lg:col-span-5 lg:gap-5">
            <TextAnalysisCard
              foodName={foodName}
              onFoodNameChange={setFoodName}
              onAnalyze={handleTextAnalysis}
              onPaste={handlePasteFromClipboard}
              pasteLoading={pasteLoading}
            />

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl bg-muted/60 p-4"
            >
              <h2 className="eyebrow">Consejos</h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Foto desde arriba, con una mano o un cubierto como escala.
                </li>
                <li className="flex items-start gap-2.5">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-carbs" aria-hidden />
                  Por texto, incluye los acompañamientos.
                </li>
              </ul>
            </motion.section>
          </div>
        </div>
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
    </motion.div>
  );
}
