"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, User, Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "💡 ¿Qué cocino con mis sobras?",
  "🍽️ Ideas para mi próxima comida",
  "🏋️ ¿Cómo ajusto mi dieta a mi objetivo?",
];

export function CoachChat() {
  const { user } = useAuth();
  const { profile, calorieData, recentMeals, weeklyProgress, activeDiet } =
    useAppData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            profile?.language === "en"
              ? "Hello! I'm your Eaty Coach. Ask me anything about your nutrition or training."
              : "¡Hola! Soy tu Eaty Coach. Pregúntame lo que quieras sobre tu nutrición o entrenamiento.",
        },
      ]);
    }
  }, [profile?.language, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !user) return;
      setLoading(true);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            message: text,
            mealsHistory: recentMeals.map((m) => ({
              foodName: m.foodName,
              calories: m.calories,
              macros: m.macros,
              createdAt: m.createdAt.toISOString(),
            })),
            dailyGoal: calorieData?.dailyGoal,
            context: {
              fitnessGoal: profile?.fitnessGoal,
              weightKg:
                typeof profile?.weight === "number" ? profile.weight : undefined,
              dailyGoal: calorieData?.dailyGoal,
              consumedToday: calorieData?.consumed,
              weeklyAvgCalories: weeklyProgress.currentWeek.averageCalories,
              activeDietName: activeDiet?.name,
            },
            lang: profile?.language,
          }),
        });
        const data = await res.json();
        if (data.response) {
          setMessages((p) => [...p, { role: "assistant", content: data.response }]);
        } else {
          throw new Error(data.error || "Error desconocido");
        }
      } catch (e) {
        logger.error("CoachChat error", e);
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content:
              "Lo siento, he tenido un problema técnico. ¿Podrías repetirme eso?",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [user, loading, recentMeals, calorieData, weeklyProgress, profile, activeDiet]
  );

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", content: msg }]);
    await sendText(msg);
  };

  const handleQuick = async (msg: string) => {
    setMessages((p) => [...p, { role: "user", content: msg }]);
    await sendText(msg);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-1 pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex w-full gap-3",
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-[10px] font-bold shadow-sm",
                m.role === "assistant"
                  ? "border-primary/20 bg-gradient-to-br from-primary to-chart-2 text-primary-foreground"
                  : "border-border/40 bg-muted text-muted-foreground"
              )}
            >
              {m.role === "assistant" ? (
                <Bot className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div
              className={cn(
                "relative max-w-[85%] min-w-0 break-words rounded-[1.5rem] px-4 py-3 text-sm shadow-sm",
                m.role === "user"
                  ? "rounded-tr-none bg-primary text-primary-foreground"
                  : "prose prose-sm rounded-tl-none border border-border/40 bg-card text-foreground dark:prose-invert prose-strong:text-primary"
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    strong: ({ node, ...props }) => (
                      <strong className="font-black text-primary" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4 list-disc marker:text-primary" {...props} />
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex w-full flex-row gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-border/40 bg-muted/50 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/40 pt-3 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-primary/20 bg-primary/5 text-[10px] font-bold text-primary"
              onClick={() => handleQuick(q)}
              disabled={loading}
            >
              {q}
            </Button>
          ))}
        </div>
        <div className="flex w-full gap-2">
          <Input
            placeholder="Pregunta sobre tu dieta o entrenamiento…"
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
        <p className="mt-2 text-center text-[9px] font-medium italic text-muted-foreground">
          <Sparkles className="mr-1 inline h-2.5 w-2.5" />
          El Coach puede cometer errores. Consulta siempre a un profesional.
        </p>
      </div>
    </div>
  );
}
