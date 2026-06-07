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
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-left">
                <DrawerTitle className="text-xl font-black">Eaty Coach</DrawerTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tu coach fitness de comida
                </p>
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
            <TabsList className="grid w-full shrink-0 grid-cols-3">
              <TabsTrigger value="today" className="gap-1.5 font-bold">
                <Sun className="h-4 w-4" /> Hoy
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 font-bold">
                <MessageCircle className="h-4 w-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="train" className="gap-1.5 font-bold">
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
