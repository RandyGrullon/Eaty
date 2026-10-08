"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, Flashlight, FlashlightOff, RotateCw, Barcode as BarcodeIcon, Check } from "lucide-react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

type CameraError = "permission" | "no-camera" | "in-use" | "unsupported" | "generic" | null;

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

function mapCameraError(err: unknown): { kind: CameraError; message: string } {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);

  if (name === "NotAllowedError" || /permission|denied/i.test(msg)) {
    return {
      kind: "permission",
      message: "Permiso de cámara denegado. Habilítalo en la configuración del navegador.",
    };
  }
  if (name === "NotFoundError" || /no.+camera|device not found/i.test(msg)) {
    return {
      kind: "no-camera",
      message: "No se encontró ninguna cámara en este dispositivo.",
    };
  }
  if (name === "NotReadableError" || /in use|busy/i.test(msg)) {
    return {
      kind: "in-use",
      message: "La cámara está siendo usada por otra app. Ciérrala y vuelve a intentarlo.",
    };
  }
  if (name === "OverconstrainedError") {
    return {
      kind: "unsupported",
      message: "No se pudo iniciar con la cámara trasera. Probaremos la frontal.",
    };
  }
  return {
    kind: "generic",
    message: msg || "No se pudo iniciar la cámara.",
  };
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<{ kind: CameraError; message: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const regionId = "barcode-scanner-region";

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch (e) {
      logger.warn("BarcodeScanner stop", e);
    }
  }, []);

  const startScanner = useCallback(async (facingMode: "environment" | "user" = "environment") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "unsupported",
        message: "Tu navegador no soporta acceso a la cámara.",
      });
      setIsInitializing(false);
      return;
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: SUPPORTED_FORMATS,
        });
      }
      const html5QrCode = scannerRef.current;

      const containerSize = Math.min(window.innerWidth, window.innerHeight);
      const qrboxWidth = Math.min(320, Math.round(containerSize * 0.78));
      const qrboxHeight = Math.round(qrboxWidth * 0.55);

      await html5QrCode.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: qrboxWidth, height: qrboxHeight },
          aspectRatio: window.innerHeight / window.innerWidth,
          disableFlip: false,
        },
        (decodedText) => {
          if (startedRef.current) return;
          startedRef.current = true;
          setDetected(true);
          // Pequeño delay para mostrar feedback visual de "detectado".
          setTimeout(() => {
            onScanRef.current(decodedText);
            void stopScanner();
          }, 220);
        },
        () => { /* per-frame "not found" — silenciar */ }
      );

      // Detectar soporte de linterna
      try {
        const settings = (html5QrCode as unknown as {
          getRunningTrackCameraCapabilities?: () => { torchFeature?: () => { isSupported: () => boolean } };
        }).getRunningTrackCameraCapabilities?.();
        const supportsTorch = !!settings?.torchFeature?.()?.isSupported?.();
        setTorchAvailable(supportsTorch);
      } catch {
        setTorchAvailable(false);
      }

      setError(null);
      setIsInitializing(false);
    } catch (err) {
      logger.error("BarcodeScanner start error", err);
      const mapped = mapCameraError(err);
      // Si la trasera falla por OverconstrainedError, probamos la frontal.
      if (mapped.kind === "unsupported" && facingMode === "environment") {
        return startScanner("user");
      }
      setError(mapped);
      setIsInitializing(false);
    }
  }, [stopScanner]);

  useEffect(() => {
    void startScanner();
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const caps = (s as unknown as {
        getRunningTrackCameraCapabilities?: () => { torchFeature?: () => { apply: (on: boolean) => Promise<void> } };
      }).getRunningTrackCameraCapabilities?.();
      const torch = caps?.torchFeature?.();
      if (torch) {
        const next = !torchOn;
        await torch.apply(next);
        setTorchOn(next);
      }
    } catch (e) {
      logger.warn("torch toggle", e);
    }
  }, [torchOn]);

  const retry = useCallback(async () => {
    setError(null);
    setIsInitializing(true);
    startedRef.current = false;
    setDetected(false);
    await stopScanner();
    scannerRef.current = null;
    await startScanner();
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black">
      {/* Región de cámara a pantalla completa */}
      <div className="absolute inset-0">
        <div id={regionId} className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
      </div>

      {/* Oscurece alrededor del recuadro */}
      {!isInitializing && !error && (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 bg-black/55"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 50% 28% at 50% 50%, transparent 0%, transparent 60%, black 100%)",
              maskImage: "radial-gradient(ellipse 50% 28% at 50% 50%, transparent 0%, transparent 60%, black 100%)",
            }}
          />
        </div>
      )}

      {/* Cabecera */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
        <span className="flex min-w-0 items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-sm font-medium text-white">
          <BarcodeIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Escanear producto</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="shrink-0 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Recuadro */}
      {!isInitializing && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            style={{ width: "78vmin", height: "44vmin", maxWidth: 380, maxHeight: 220 }}
            animate={detected ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            {[
              "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
              "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
              "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
              "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
            ].map((cls, i) => (
              <div key={i} className={cn("absolute h-10 w-10 border-primary transition-colors", cls)} />
            ))}

            {/* Línea de escaneo */}
            {!detected && (
              <motion.div
                className="absolute left-2 right-2 h-0.5 rounded-full bg-primary"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Detectado */}
            {detected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
              </motion.div>
            )}

            <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/70">
              {detected ? "Código detectado" : "Centra el código de barras"}
            </p>
          </motion.div>
        </div>
      )}

      {/* Iniciando */}
      {isInitializing && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-white/80">Iniciando cámara…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="mb-2 text-lg font-semibold text-white">
            {error.kind === "permission"
              ? "Sin permiso"
              : error.kind === "no-camera"
                ? "Cámara no disponible"
                : error.kind === "in-use"
                  ? "Cámara ocupada"
                  : error.kind === "unsupported"
                    ? "Navegador incompatible"
                    : "Error de cámara"}
          </p>
          <p className="mb-8 max-w-sm text-sm text-white/70">{error.message}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {error.kind !== "unsupported" && error.kind !== "no-camera" && (
              <Button onClick={retry} className="h-11 rounded-full">
                <RotateCw className="h-4 w-4" />
                Reintentar
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="h-11 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* Controles inferiores */}
      {!isInitializing && !error && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          {torchAvailable && (
            <Button
              onClick={toggleTorch}
              variant="outline"
              size="icon"
              aria-label={torchOn ? "Apagar linterna" : "Encender linterna"}
              className={cn(
                "h-14 w-14 rounded-full transition-colors",
                torchOn
                  ? "border-carbs bg-carbs/25 text-carbs hover:bg-carbs/35 hover:text-carbs"
                  : "border-white/25 bg-black/60 text-white hover:bg-black/80 hover:text-white"
              )}
            >
              {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            </Button>
          )}
          <p className="text-xs text-white/60">EAN · UPC · Code 128 · QR · DataMatrix</p>
        </div>
      )}
    </div>
  );
}
