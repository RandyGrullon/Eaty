"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, User, Bot, Lightbulb, UtensilsCrossed, Target } from "lucide-react";
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
  { label: "¿Qué cocino con mis sobras?", icon: Lightbulb },
  { label: "Ideas para mi próxima comida", icon: UtensilsCrossed },
  { label: "¿Cómo ajusto mi dieta a mi objetivo?", icon: Target },
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
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-1 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex w-full gap-2.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "relative min-w-0 max-w-[85%] break-words rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-tr-md bg-primary text-primary-foreground"
                  : "prose prose-sm rounded-tl-md border border-border bg-card text-foreground dark:prose-invert"
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-4 list-disc marker:text-primary" {...props} />,
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
          <div className="flex w-full flex-row gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-md border border-border bg-muted/60 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border pt-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="h-8 max-w-full gap-1.5 rounded-full px-3 text-xs font-medium"
              onClick={() => handleQuick(label)}
              disabled={loading}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>
        <div className="flex w-full gap-2">
          <Input
            placeholder="Pregunta sobre tu dieta o entrenamiento…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="h-11 min-w-0 rounded-full px-4"
            aria-label="Mensaje para el Coach"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 shrink-0" />
          El Coach puede equivocarse. Consulta siempre a un profesional.
        </p>
      </div>
    </div>
  );
}
