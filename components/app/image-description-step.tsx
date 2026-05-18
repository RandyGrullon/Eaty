"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ImageDescriptionStepProps = {
  file: File;
  description: string;
  onDescriptionChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function ImageDescriptionStep({
  file,
  description,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: ImageDescriptionStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold">Agregar descripción</h1>
          <p className="text-sm opacity-90">
            Puedes dejar la descripción vacía: la IA estima según la foto.
            <span className="hidden sm:inline"> Un texto extra mejora la precisión.</span>
            <strong> Consejo:</strong> incluye un objeto de referencia (mano o cubierto) para mejor escala.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl flex-1 p-4">
        <div className="space-y-4">
          <div className="rounded-lg bg-card p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Imagen seleccionada"
                className="h-48 w-full rounded-lg object-cover"
              />
            ) : null}
          </div>
          <div className="space-y-3">
            <Label
              htmlFor="meal-image-description"
              className="text-sm font-medium text-card-foreground"
            >
              Descripción (opcional)
            </Label>
            <Textarea
              id="meal-image-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Ej: Pizza con pepperoni, ensalada con aderezo de vinagreta, etc."
              className="min-h-[5.5rem] resize-none text-sm"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Analizar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
