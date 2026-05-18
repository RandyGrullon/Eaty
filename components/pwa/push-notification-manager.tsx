"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported("Notification" in window && "serviceWorker" in navigator);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast({
          title: "¡Suscrito!",
          description: "Recibirás recordatorios para registrar tus comidas.",
        });
        
        // Aquí se registraría la suscripción en el Service Worker y se enviaría al servidor
        // Para el demo, mostramos el éxito
        const registration = await navigator.serviceWorker.ready;
        logger.info("Push: Service worker ready for push", registration);
      }
    } catch (e) {
      logger.error("Push", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${permission === "granted" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {permission === "granted" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-bold">Recordatorios Push</p>
          <p className="text-[10px] text-muted-foreground">
            {permission === "granted" 
              ? "Activados: te avisaremos si olvidas una comida." 
              : "No te pierdas ninguna comida. Activa los avisos."}
          </p>
        </div>
      </div>
      <Button
        variant={permission === "granted" ? "outline" : "default"}
        size="sm"
        disabled={loading || permission === "granted"}
        onClick={requestPermission}
        className="rounded-xl font-bold"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : permission === "granted" ? "Activos" : "Activar"}
      </Button>
    </div>
  );
}
