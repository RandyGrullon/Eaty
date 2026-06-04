"use client";

import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

/**
 * Inicializa la cámara trasera y la enlaza a un <video>. Devuelve el ref del
 * video, si está listo y un posible error. Detiene el stream al desmontar.
 */
export function useCameraStream(onReady?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((e) => logger.error("play", e));
            setReady(true);
            onReadyRef.current?.();
          };
        }
      })
      .catch((err) => {
        logger.error("cam", err);
        setError("No se pudo acceder a la cámara. Revisa los permisos.");
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, ready, error };
}
