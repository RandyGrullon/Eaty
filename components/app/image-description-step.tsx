"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lightbulb, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";

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
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <PageHeader
        title="Añadir descripción"
        subtitle="Opcional: un texto extra mejora la precisión."
        leading={
          <Button
            variant="outline"
            size="icon"
            onClick={onCancel}
            className="h-10 w-10 shrink-0 rounded-full"
            aria-label="Cancelar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-10">
        <section className="surface space-y-5 p-5 sm:p-6">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted sm:aspect-[2/1]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Imagen seleccionada" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full animate-pulse bg-muted" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meal-image-description" className="text-sm font-medium">
              Descripción (opcional)
            </Label>
            <Textarea
              id="meal-image-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Ej.: pizza de pepperoni, ensalada con vinagreta…"
              className="min-h-[5.5rem] resize-none rounded-xl text-sm"
              rows={3}
            />
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-carbs" aria-hidden />
            Si la dejas vacía, la IA estima solo con la foto. Una mano o un cubierto en la imagen ayuda con la escala.
          </p>

          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" className="h-11 flex-1 rounded-full">
              Cancelar
            </Button>
            <Button onClick={onSubmit} className="h-11 flex-1 rounded-full">
              <Sparkles className="h-4 w-4" />
              Analizar
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
