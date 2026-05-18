"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, Sparkles, User, Bot, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCalorieTracker } from "@/hooks/use-calorie-tracker";
import { getRecentActivities } from "@/lib/meals";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import { useUserProfile } from "@/hooks/use-user-profile";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AICoachDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { calorieData } = useCalorieTracker();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: userProfile?.language === "en" 
            ? "Hello! I am your Eaty Coach. How can I help you today with your nutrition?"
            : "¡Hola! Soy tu Eaty Coach. ¿En qué puedo ayudarte hoy con tu alimentación?",
        },
      ]);
    }
  }, [userProfile?.language, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendWithText = useCallback(async (text: string) => {
    if (!text.trim() || loading || !user) return;

    setLoading(true);
    try {
      // Obtener historial reciente para el contexto
      const recentMeals = await getRecentActivities(user.uid, 10);
      
      const idToken = await user.getIdToken();
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: text,
          mealsHistory: recentMeals.map(m => ({
            foodName: m.foodName,
            calories: m.calories,
            macros: m.macros,
            createdAt: m.createdAt.toISOString(),
          })),
          dailyGoal: calorieData?.dailyGoal,
          lang: userProfile?.language,
        }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (e) {
      logger.error("AICoach error", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, he tenido un problema técnico. ¿Podrías repetirme eso?" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, calorieData, loading, userProfile?.language]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    await handleSendWithText(msg);
  };

  const handleLeftoversRequest = async () => {
    const msg = "💡 ¿Qué puedo cocinar con los ingredientes de mis platos recientes?";
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    await handleSendWithText(msg);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg flex flex-col h-[75vh] overflow-hidden">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-black">Eaty Coach</DrawerTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tu asistente personal</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-6"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex w-full gap-3",
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-2xl border text-[10px] font-bold shadow-sm transition-transform hover:scale-105",
                  m.role === "assistant" 
                    ? "bg-gradient-to-br from-primary via-primary to-chart-2 text-primary-foreground border-primary/20" 
                    : "bg-muted text-muted-foreground border-border/40"
                )}>
                  {m.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div className={cn(
                  "relative max-w-[85%] rounded-[1.8rem] px-5 py-3.5 text-sm shadow-sm transition-all",
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                    : "bg-card text-foreground rounded-tl-none border border-border/40 prose prose-sm prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-foreground prose-strong:text-primary dark:prose-invert shadow-black/[0.02]"
                )}>
                  {m.role === "assistant" ? (
                    <div className="prose-h3:text-lg prose-h3:font-black prose-h3:mb-2 prose-p:mb-3 last:prose-p:mb-0 prose-li:my-1">
                      <ReactMarkdown
                        components={{
                          h3: ({ node, ...props }) => <h3 className="text-primary flex items-center gap-2" {...props}><Sparkles className="h-4 w-4" /> {props.children}</h3>,
                          strong: ({ node, ...props }) => <strong className="text-primary font-black" {...props} />,
                          li: ({ node, ...props }) => <li className="list-disc ml-4 marker:text-primary" {...props} />,
                          code: ({ node, ...props }) => <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold text-[0.8em]" {...props} />,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex w-full gap-3 flex-row">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-none border border-border/40 px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div className="h-4" />
          </div>

          <DrawerFooter className="border-t p-4 sm:p-6 bg-background/50 backdrop-blur-sm shrink-0">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full text-[10px] font-bold h-8 border-primary/20 bg-primary/5 text-primary"
                onClick={handleLeftoversRequest}
                disabled={loading}
              >
                💡 ¿Qué cocino con mis sobras?
              </Button>
            </div>
            <div className="flex w-full gap-2">
              <Input
                placeholder="Pregunta algo sobre tu dieta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="rounded-xl border-border/60 bg-muted/30 focus-visible:ring-primary/20"
              />
              <Button 
                onClick={handleSend} 
                disabled={loading || !input.trim()}
                className="rounded-xl px-5"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[9px] font-medium text-muted-foreground italic">
              El Coach puede cometer errores. Consulta siempre a un profesional.
            </p>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
