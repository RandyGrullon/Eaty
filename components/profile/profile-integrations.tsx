"use client";

import { Button } from "@/components/ui/button";
import { Apple, ShieldCheck, ExternalLink } from "lucide-react";
import { PushNotificationManager } from "@/components/pwa/push-notification-manager";
import { useToast } from "@/hooks/use-toast";

/** Tarjetas de conectividad/avisos. De momento son integraciones simuladas. */
export function ProfileIntegrations() {
  const { toast } = useToast();

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight text-foreground">Conectividad y Avisos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PushNotificationManager />

        <IntegrationCard
          icon={<Apple className="h-5 w-5" />}
          iconClass="bg-black text-white"
          title="Apple Health"
          subtitle="Sincroniza pasos y actividad."
          actionLabel="Conectar"
          onAction={() => toast({ title: "HealthKit", description: "Conexión simulada con éxito." })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClass="bg-primary/10 text-primary"
          title="Biometría"
          subtitle="FaceID / Huella dactilar."
          actionLabel="Activar"
          onAction={() => toast({ title: "WebAuthn", description: "Biometría activada (Simulación)." })}
        />

        <IntegrationCard
          icon={<ExternalLink className="h-5 w-5" />}
          iconClass="bg-chart-2/10 text-chart-2"
          title="Reporte Email"
          subtitle="Resumen semanal de progreso."
          actionLabel="Suscrito"
          onAction={() => toast({ title: "Email Marketing", description: "Suscripción actualizada." })}
        />
      </div>
    </section>
  );
}

interface IntegrationCardProps {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

function IntegrationCard({
  icon,
  iconClass,
  title,
  subtitle,
  actionLabel,
  onAction,
}: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg ${iconClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onAction}
        className="rounded-xl font-bold border-primary/20 hover:bg-primary/5"
      >
        {actionLabel}
      </Button>
    </div>
  );
}
