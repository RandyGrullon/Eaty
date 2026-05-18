"use client";

import { motion } from "framer-motion";
import { Users, Trophy, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Challenge {
  id: string;
  title: string;
  description: string;
  participants: number;
  daysLeft: number;
  reward: string;
  color: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: "1",
    title: "Semana sin Azúcar",
    description: "Evita azúcares añadidos durante 7 días seguidos.",
    participants: 1240,
    daysLeft: 3,
    reward: "Insignia 'Pureza'",
    color: "bg-primary",
  },
  {
    id: "2",
    title: "Reto Hidratación",
    description: "Bebe 8 vasos de agua al día por una semana.",
    participants: 3500,
    daysLeft: 5,
    reward: "Tema 'Océano'",
    color: "bg-chart-2",
  },
];

export function CommunityChallenges() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Retos de Comunidad
        </h3>
        <Button variant="ghost" size="sm" className="text-xs font-bold gap-1 text-primary">
          Ver todos <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CHALLENGES.map((challenge, idx) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-md"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${challenge.color} text-white shadow-lg`}>
                  <Zap className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-tighter">
                  {challenge.daysLeft} días restantes
                </Badge>
              </div>

              <div>
                <p className="text-base font-black tracking-tight">{challenge.title}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + Number(challenge.id)}`} alt="user" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">+{challenge.participants} participando</span>
                </div>
                <Button size="sm" className="rounded-xl h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                  Unirse
                </Button>
              </div>
            </div>

            {/* Decorative background glow */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${challenge.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
