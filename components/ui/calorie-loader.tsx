"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CalorieLoaderProps {
  message?: string;
}

export function CalorieLoader({
  message = "Calculando calorías diarias...",
}: CalorieLoaderProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
