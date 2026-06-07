import { z } from "zod";

export const workoutExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(40), // "8-12", "30 s", "Al fallo"
  restSec: z.number().int().min(0).max(600).default(60),
  notes: z.string().max(300).optional(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutDaySchema = z.object({
  day: z.string().min(1).max(60), // "Día 1 — Empuje", "Lunes"
  focus: z.string().max(120).optional(),
  exercises: z.array(workoutExerciseSchema).min(1).max(15),
});
export type WorkoutDay = z.infer<typeof workoutDaySchema>;

/** Payload de IA al generar una rutina (sin id ni fecha). */
export const generatedWorkoutSchema = z.object({
  title: z.string().min(2).max(120),
  goal: z.string().min(2).max(120),
  daysPerWeek: z.number().int().min(1).max(7),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  estimatedCaloriesPerSession: z.number().min(0).max(2000).optional(),
  warmup: z.array(z.string().min(2).max(200)).max(8).default([]),
  days: z.array(workoutDaySchema).min(1).max(7),
  tips: z.array(z.string().min(4).max(300)).max(8).default([]),
});
export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

/** Documento de rutina (en `users/{uid}/workouts/{id}`). */
export interface Workout extends GeneratedWorkout {
  id: string;
  createdAt: Date;
}

export const LEVEL_LABEL: Record<GeneratedWorkout["level"], string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};
