"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, UserPlus } from "lucide-react";

interface UpgradeAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUCCESS_MESSAGE = "Cuenta creada. Tus comidas se conservaron.";

/**
 * Convierte la sesión de invitado en una cuenta real (correo o Google) sin
 * perder los datos: enlaza la credencial al mismo usuario anónimo.
 */
export function UpgradeAccountDialog({ open, onOpenChange }: UpgradeAccountDialogProps) {
  const { linkGuestWithEmail, linkGuestWithGoogle } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const finish = () => {
    toast({ title: SUCCESS_MESSAGE });
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await linkGuestWithEmail(email.trim(), password);
      finish();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await linkGuestWithGoogle();
      finish();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo continuar con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </span>
          <DialogTitle className="text-xl font-semibold">Crea tu cuenta</DialogTitle>
          <DialogDescription>
            Guarda tu progreso de invitado en una cuenta real. Tus comidas y metas se conservan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upgrade-email">Correo electrónico</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="upgrade-email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upgrade-password">Contraseña</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="upgrade-password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upgrade-confirm">Confirmar contraseña</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="upgrade-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full rounded-full text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta…
              </>
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={loading}
          className="h-11 w-full gap-2 rounded-full text-base"
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          Continuar con Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
