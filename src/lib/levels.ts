/** Escada de níveis e regras do plano de estudo (client-safe). */

export const LEVELS = ["beginner", "elementary", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner (A1)",
  elementary: "Elementary (A2)",
  intermediate: "Intermediate (B1)",
  advanced: "Advanced (B2)",
};

export const DAILY_GOALS = [10, 15, 30, 60] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export const GOAL_LABEL: Record<number, string> = {
  10: "10 min/dia — leve",
  15: "15 min/dia — regular",
  30: "30 min/dia — sério",
  60: "60 min/dia — intenso",
};

/** Dias mínimos em cada nível, calibrados para: 15 min/dia ≈ 3 meses, 30 min/dia ≈ 2 meses no curso completo. */
export function daysPerLevel(goalMinutes: number): number {
  if (goalMinutes >= 60) return 11;
  if (goalMinutes >= 30) return 15;
  if (goalMinutes >= 15) return 23;
  return 30;
}

/** XP-alvo de um dia em que o aluno cumpre a meta. */
export function dailyGoalXp(goalMinutes: number): number {
  return goalMinutes * 4;
}

/** XP necessário dentro do nível atual para liberar o teste de passagem. */
export function levelXpRequired(goalMinutes: number): number {
  return dailyGoalXp(goalMinutes) * daysPerLevel(goalMinutes);
}

/** Ofensiva mínima (dias seguidos) para liberar o teste. */
export const STREAK_REQUIRED = 7;

/** Custo, em pontos, de um escudo de ofensiva. */
export const SHIELD_COST = 400;
export const SHIELD_MAX = 2;

/** Nota mínima (0-100) para passar de nível. */
export const PASS_SCORE = 70;

export function nextLevel(level: Level): Level | null {
  const i = LEVELS.indexOf(level);
  return i >= 0 && i < LEVELS.length - 1 ? (LEVELS[i + 1] as Level) : null;
}

export function estimatedMonths(goalMinutes: number): number {
  const total = daysPerLevel(goalMinutes) * LEVELS.length;
  return Math.round((total / 30) * 10) / 10;
}
