"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Loader2, Camera, AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "barcode-scanner-region";

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(regionId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (mounted) {
              onScan(decodedText);
              stopScanner();
            }
          },
          () => {
            // Ignorar errores de "no encontrado" en cada frame
          }
        );

        if (mounted) setIsInitializing(false);
      } catch (err) {
        logger.error("BarcodeScanner start error", err);
        if (mounted) {
          setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
          setIsInitializing(false);
        }
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          logger.error("BarcodeScanner stop error", e);
        }
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      void stopScanner();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-black">Escaneo de producto</h2>
            <p className="text-xs text-muted-foreground">Encuadra el código de barras</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="relative aspect-square w-full bg-muted">
          <div id={regionId} className="h-full w-full" />
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold">Iniciando cámara...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Cerrar
              </Button>
            </div>
          )}

          {/* Guía visual */}
          {!isInitializing && !error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[150px] w-[250px] border-2 border-primary border-dashed rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/50 animate-pulse" />
            </div>
          )}
        </div>

        <div className="p-6 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Soporta EAN-13, UPC, Code 128 y más.
          </p>
        </div>
      </div>
    </div>
  );
}
