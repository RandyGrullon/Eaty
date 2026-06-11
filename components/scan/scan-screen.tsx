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
      className="relative w-full min-w-0 max-w-full min-h-0 overflow-x-hidden bg-background"
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-primary/10 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary bg-background/90 p-12 shadow-2xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-10 w-10 animate-bounce" />
              </div>
              <p className="text-xl font-black text-foreground">Suelta para analizar</p>
              <p className="text-sm text-muted-foreground font-medium">Puedes arrastrar cualquier foto de comida aquí</p>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-black animate-pulse">Buscando producto...</p>
          </div>
        </div>
      )}

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
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-primary"
          >
            Escanear
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1.5 font-sans text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl"
          >
            Formas de analizar
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:mx-0 sm:text-base"
          >
            Usa la cámara para platos, escanea códigos de barras para productos o escribe el nombre.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <ScanModeCard
            icon={ScanLine}
            badge="Premium"
            title="Escáner AR"
            description="Escaneo 3D en vivo con realidad aumentada."
            iconWrapClassName="bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse"
            onClick={() => setIsLiveScannerOpen(true)}
            index={0}
          />
          <ScanModeCard
            icon={Camera}
            badge="Básico"
            title="Cámara"
            description="Captura una foto usando la app de tu sistema."
            iconWrapClassName="bg-chart-1 text-chart-1-foreground"
            onClick={handleCameraCapture}
            index={1}
          />
          <ScanModeCard
            icon={Barcode}
            badge="UPC/EAN"
            title="Código de barras"
            description="Escanea paquetes para datos nutricionales."
            iconWrapClassName="bg-chart-2 text-chart-2-foreground"
            onClick={() => setIsBarcodeOpen(true)}
            index={2}
          />
          <ScanModeCard
            icon={QrCode}
            badge="Scan"
            title="Escáner QR"
            description="Analiza productos mediante códigos QR."
            iconWrapClassName="bg-chart-3 text-chart-3-foreground"
            onClick={() => setIsBarcodeOpen(true)}
            index={3}
          />
          <ScanModeCard
            icon={Upload}
            badge="Files"
            title="Subir imagen"
            description="Analiza fotos de tu galería o archivos."
            iconWrapClassName="bg-muted text-foreground"
            onClick={handleFileUpload}
            index={4}
          />
          <ScanModeCard
            icon={ClipboardPaste}
            badge="Multi"
            title="Pegar"
            description="Pega imágenes o texto desde tu portapapeles."
            iconWrapClassName="bg-accent text-accent-foreground"
            onClick={handlePasteFromClipboard}
            index={5}
          />
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 text-xs text-muted-foreground"
        >
          <div className="h-px flex-1 bg-border/80" aria-hidden />
          <span className="shrink-0 font-medium">o solo con texto</span>
          <div className="h-px flex-1 bg-border/80" aria-hidden />
        </motion.div>

        <TextAnalysisCard
          foodName={foodName}
          onFoodNameChange={setFoodName}
          onAnalyze={handleTextAnalysis}
          onPaste={handlePasteFromClipboard}
          pasteLoading={pasteLoading}
        />

        <motion.ul 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex min-w-0 max-w-full flex-col gap-2.5 break-words rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-1 sm:py-3"
        >
          <li className="flex items-center gap-2">
            <ScanLine
              className="h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden
            />
            Foto: plano cenital o con una mano/cubierto para escala.
          </li>
          <li className="hidden h-3 w-px bg-border/80 sm:block" aria-hidden />
          <li className="flex items-center gap-2">
            <Lightbulb
              className="h-3.5 w-3.5 shrink-0 text-chart-2"
              aria-hidden
            />
            Texto: incluye acompañamientos si aplica.
          </li>
        </motion.ul>
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
