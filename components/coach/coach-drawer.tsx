"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, X, Sun, MessageCircle, Dumbbell } from "lucide-react";
import { CoachToday } from "./coach-today";
import { CoachChat } from "./coach-chat";
import { CoachWorkout } from "./coach-workout";

export function CoachDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto flex h-[84vh] w-full max-w-lg flex-col overflow-hidden">
          <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-left">
                <DrawerTitle className="text-lg font-semibold">Eaty Coach</DrawerTitle>
                <p className="text-sm text-muted-foreground">Tu coach de comida y entreno</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <Tabs
            defaultValue="today"
            className="flex min-h-0 flex-1 flex-col px-4 pt-3"
          >
            <TabsList className="grid h-10 w-full shrink-0 grid-cols-3 rounded-full">
              <TabsTrigger value="today" className="gap-1.5 rounded-full font-medium">
                <Sun className="h-4 w-4" /> Hoy
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 rounded-full font-medium">
                <MessageCircle className="h-4 w-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="train" className="gap-1.5 rounded-full font-medium">
                <Dumbbell className="h-4 w-4" /> Entreno
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="today"
              className="mt-3 min-h-0 flex-1 overflow-y-auto"
            >
              <CoachToday />
            </TabsContent>
            <TabsContent
              value="chat"
              className="mt-3 min-h-0 flex-1 overflow-hidden"
            >
              <CoachChat />
            </TabsContent>
            <TabsContent
              value="train"
              className="mt-3 min-h-0 flex-1 overflow-y-auto"
            >
              <CoachWorkout />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
