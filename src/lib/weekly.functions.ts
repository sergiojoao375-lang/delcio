import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WeeklyReport = {
  days: Array<{ day: string; minutes: number; xp: number; goalMet: boolean }>;
  totalMinutes: number;
  goalMinutes: number;
  totalXp: number;
  exercises: number;
  newWords: number;
  corrections: number;
  daysActive: number;
  streak: number;
  shields: number;
  letter: string;
};

export const getWeeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WeeklyReport> => {
    const { supabase, userId } = context;
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    }
    const since = `${days[0]}T00:00:00Z`;

    const [{ data: acts }, { data: prof }, { count: newWords }] = await Promise.all([
      supabase.from("daily_activity").select("day, minutes, xp, exercises, goal_met").eq("user_id", userId).gte("day", days[0]!),
      supabase.from("learner_profiles").select("daily_goal_minutes, streak_current, shields, level").eq("user_id", userId).maybeSingle(),
      supabase.from("vocab_items").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
    ]);

    const map = new Map((acts ?? []).map((a: any) => [a.day, a]));
    const list = days.map((d) => {
      const a: any = map.get(d);
      return { day: d, minutes: a?.minutes ?? 0, xp: a?.xp ?? 0, goalMet: !!a?.goal_met };
    });
    const totalMinutes = list.reduce((s, d) => s + d.minutes, 0);
    const totalXp = list.reduce((s, d) => s + d.xp, 0);
    const exercises = (acts ?? []).reduce((s: number, a: any) => s + (a.exercises ?? 0), 0);
    const daysActive = list.filter((d) => d.minutes > 0).length;
    const goal = (prof?.daily_goal_minutes ?? 15) * 7;
    const words = newWords ?? 0;

    let letter = "";
    const key = process.env["LOVABLE_API_KEY"];
    if (key) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "És o Professor Delcio, professor de inglês caloroso. Escreve em português uma carta curta (máx. 70 palavras) ao aluno sobre a semana: elogia o esforço, nunca culpes, e dá 1 dica prática para a próxima semana. Sem markdown.",
              },
              {
                role: "user",
                content: `Nível: ${prof?.level}. Minutos: ${totalMinutes}/${goal}. Dias ativos: ${daysActive}/7. Exercícios: ${exercises}. Palavras novas: ${words}. Ofensiva: ${prof?.streak_current ?? 0} dias.`,
              },
            ],
          }),
        });
        if (res.ok) {
          const j = (await res.json()) as any;
          letter = (j.choices?.[0]?.message?.content ?? "").trim();
        }
      } catch {
        /* fallback below */
      }
    }
    if (!letter) {
      letter =
        daysActive > 0
          ? `Parabéns! Estudaste ${daysActive} dia(s) esta semana. Cada minuto conta — continua assim e tenta praticar um pouquinho todos os dias.`
          : "Esta semana foi mais calma, e está tudo bem! Que tal começar amanhã com apenas 5 minutos de conversa comigo?";
    }

    return {
      days: list,
      totalMinutes,
      goalMinutes: goal,
      totalXp,
      exercises,
      newWords: words,
      corrections: words,
      daysActive,
      streak: prof?.streak_current ?? 0,
      shields: prof?.shields ?? 0,
      letter,
    };
  });
