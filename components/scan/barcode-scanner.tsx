"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, Flashlight, FlashlightOff, RotateCw, Barcode as BarcodeIcon } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
      {/* Camera region — fills screen */}
      <div className="absolute inset-0">
        <div id={regionId} className="h-full w-full [&>video]:object-cover [&>video]:h-full [&>video]:w-full" />
      </div>

      {/* Darken overlay around the box */}
      {!isInitializing && !error && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Outer dim */}
          <div className="absolute inset-0 bg-black/55" style={{
            WebkitMaskImage: "radial-gradient(ellipse 50% 28% at 50% 50%, transparent 0%, transparent 60%, black 100%)",
            maskImage: "radial-gradient(ellipse 50% 28% at 50% 50%, transparent 0%, transparent 60%, black 100%)",
          }} />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 pt-12 pb-3 pointer-events-auto">
        <div className="rounded-full bg-black/55 backdrop-blur-md px-4 py-2 border border-white/10">
          <p className="text-white text-[11px] font-black flex items-center gap-2 uppercase tracking-[0.2em]">
            <BarcodeIcon className="h-3 w-3 text-emerald-400" />
            Escáner de producto
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={onClose}
          className="rounded-full bg-black/55 text-white hover:bg-black/75 border border-white/10 backdrop-blur-md"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Reticle frame */}
      {!isInitializing && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="relative"
            style={{ width: "78vmin", height: "44vmin", maxWidth: 380, maxHeight: 220 }}
            animate={detected ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            {/* Corners */}
            {[
              "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
              "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
              "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
              "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
            ].map((cls, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-10 h-10 transition-colors",
                  detected ? "border-emerald-400" : "border-emerald-400",
                  cls
                )}
                style={{ boxShadow: detected ? "0 0 22px rgba(52,211,153,0.85)" : "0 0 14px rgba(52,211,153,0.45)" }}
              />
            ))}

            {/* Scanning red beam */}
            {!detected && (
              <motion.div
                className="absolute left-2 right-2 h-[2px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.95), transparent)",
                  boxShadow: "0 0 12px rgba(239, 68, 68, 0.8)",
                }}
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Detected check */}
            {detected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="bg-emerald-500 rounded-full p-3 shadow-lg shadow-emerald-500/50">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </motion.div>
            )}

            <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/55 tracking-widest uppercase whitespace-nowrap">
              {detected ? "Código detectado" : "Centra el código de barras"}
            </p>
          </motion.div>
        </div>
      )}

      {/* Initializing */}
      {isInitializing && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-4">
          <div className="w-12 h-12 rounded-full border-[2.5px] border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-emerald-400/85 text-sm font-black tracking-widest uppercase">
            Iniciando cámara...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center">
          <div className="h-16 w-16 bg-red-500/15 rounded-full flex items-center justify-center mb-5">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="font-black text-white text-lg mb-2">
            {error.kind === "permission" ? "Sin permiso" :
              error.kind === "no-camera" ? "Cámara no disponible" :
                error.kind === "in-use" ? "Cámara ocupada" :
                  error.kind === "unsupported" ? "Navegador incompatible" : "Error de cámara"}
          </p>
          <p className="text-sm text-white/55 mb-8 max-w-sm">{error.message}</p>
          <div className="flex gap-3">
            {error.kind !== "unsupported" && error.kind !== "no-camera" && (
              <Button
                onClick={retry}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-xl bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!isInitializing && !error && (
        <div className="absolute bottom-0 inset-x-0 z-10 flex flex-col items-center pb-12 pointer-events-auto gap-4">
          {torchAvailable && (
            <Button
              onClick={toggleTorch}
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full w-14 h-14 border-white/20 backdrop-blur-md transition-colors",
                torchOn
                  ? "bg-yellow-400/20 text-yellow-300 border-yellow-300/40"
                  : "bg-black/55 text-white hover:bg-black/75"
              )}
            >
              {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            </Button>
          )}
          <p className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
            EAN · UPC · Code 128 · QR · DataMatrix
          </p>
        </div>
      )}
    </div>
  );
}
