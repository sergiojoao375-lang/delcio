import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LEVELS,
  PASS_SCORE,
  SHIELD_COST,
  SHIELD_MAX,
  STREAK_REQUIRED,
  daysPerLevel,
  dailyGoalXp,
  levelXpRequired,
  nextLevel,
  type Level,
} from "@/lib/levels";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const AI_MODEL = "openai/gpt-6-astra";

type TestQuestion = {
  id: string;
  skill: "reading" | "grammar" | "conversation";
  prompt: string;
  passage?: string;
  expected?: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function asLevel(value: unknown): Level {
  return LEVELS.includes(value as Level) ? (value as Level) : "beginner";
}

async function askAI(system: string, user: string): Promise<any> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("IA indisponível no momento.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AI_MODEL,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Muitas solicitações. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha na IA: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s < 0 || e <= s) throw new Error("Não consegui interpretar a resposta da IA.");
    return JSON.parse(cleaned.slice(s, e + 1));
  }
}

async function loadOrCreateProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("learner_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

async function xpInCurrentLevel(supabase: any, userId: string, levelStartedAt: string) {
  const since = levelStartedAt.slice(0, 10);
  const { data } = await supabase
    .from("daily_activity")
    .select("xp, minutes, day")
    .eq("user_id", userId)
    .gte("day", since);
  const rows = (data ?? []) as Array<{ xp: number; minutes: number }>;
  return {
    xp: rows.reduce((s, r) => s + (r.xp ?? 0), 0),
    minutes: rows.reduce((s, r) => s + (r.minutes ?? 0), 0),
    days: rows.length,
  };
}

function summarize(profile: any, levelXp: { xp: number; minutes: number; days: number }) {
  const goal = profile.daily_goal_minutes as number;
  const level = asLevel(profile.level);
  const required = levelXpRequired(goal);
  const daysRequired = daysPerLevel(goal);
  const daysInLevel = Math.max(
    0,
    dayDiff((profile.level_started_at as string).slice(0, 10), todayISO()),
  );
  const next = nextLevel(level);
  return {
    level,
    nextLevel: next,
    dailyGoalMinutes: goal,
    dailyGoalXp: dailyGoalXp(goal),
    onboardingDone: !!profile.onboarding_done,
    placementDone: !!profile.placement_done,
    points: profile.points as number,
    xpTotal: profile.xp_total as number,
    streak: profile.streak_current as number,
    streakBest: profile.streak_best as number,
    shields: profile.shields as number,
    shieldCost: SHIELD_COST,
    shieldMax: SHIELD_MAX,
    lastActiveDate: (profile.last_active_date as string | null) ?? null,
    planStartedAt: profile.plan_started_at as string,
    levelStartedAt: profile.level_started_at as string,
    levelXp: levelXp.xp,
    levelXpRequired: required,
    levelDays: Math.max(daysInLevel, levelXp.days),
    levelDaysRequired: daysRequired,
    streakRequired: STREAK_REQUIRED,
    testUnlocked:
      !!next &&
      levelXp.xp >= required &&
      (profile.streak_current as number) >= STREAK_REQUIRED &&
      Math.max(daysInLevel, levelXp.days) >= daysRequired,
  };
}

/* ------------------------------------------------------------------ */
/* profile / plan                                                     */
/* ------------------------------------------------------------------ */

export const getLearner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadOrCreateProfile(context.supabase, context.userId);
    const levelXp = await xpInCurrentLevel(
      context.supabase,
      context.userId,
      profile.level_started_at,
    );
    const { data: today } = await context.supabase
      .from("daily_activity")
      .select("minutes, xp, exercises, goal_met")
      .eq("user_id", context.userId)
      .eq("day", todayISO())
      .maybeSingle();
    return {
      ...summarize(profile, levelXp),
      today: {
        minutes: today?.minutes ?? 0,
        xp: today?.xp ?? 0,
        exercises: today?.exercises ?? 0,
        goalMet: today?.goal_met ?? false,
      },
    };
  });

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dailyGoalMinutes: number; declaredLevel: string }) => d)
  .handler(async ({ data, context }) => {
    await loadOrCreateProfile(context.supabase, context.userId);
    const goal = [10, 15, 30, 60].includes(data.dailyGoalMinutes) ? data.dailyGoalMinutes : 15;
    const declared = asLevel(data.declaredLevel);
    const needsTest = declared !== "beginner";
    const { error } = await context.supabase
      .from("learner_profiles")
      .update({
        daily_goal_minutes: goal,
        level: needsTest ? declared : "beginner",
        onboarding_done: true,
        placement_done: !needsTest,
        plan_started_at: new Date().toISOString(),
        level_started_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { needsTest, declaredLevel: declared, dailyGoalMinutes: goal };
  });

export const updateDailyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dailyGoalMinutes: number }) => d)
  .handler(async ({ data, context }) => {
    const goal = [10, 15, 30, 60].includes(data.dailyGoalMinutes) ? data.dailyGoalMinutes : 15;
    await context.supabase
      .from("learner_profiles")
      .update({ daily_goal_minutes: goal })
      .eq("user_id", context.userId);
    return { ok: true, dailyGoalMinutes: goal };
  });

/* ------------------------------------------------------------------ */
/* daily activity, streak, shields                                    */
/* ------------------------------------------------------------------ */

async function applyActivity(
  supabase: any,
  userId: string,
  input: { minutes?: number; xp?: number; exercises?: number },
) {
  const minutes = Math.max(0, Math.min(30, Math.round(input.minutes ?? 0)));
  const xp = Math.max(0, Math.min(200, Math.round(input.xp ?? 0)));
  const exercises = Math.max(0, Math.min(20, Math.round(input.exercises ?? 0)));
  if (!minutes && !xp && !exercises) return { ok: true as const, skipped: true as const };

  const profile = await loadOrCreateProfile(supabase, userId);
  const day = todayISO();

  const { data: existing } = await supabase
    .from("daily_activity")
    .select("id, minutes, xp, exercises, goal_met")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();

  const totalMinutes = (existing?.minutes ?? 0) + minutes;
  const totalXp = (existing?.xp ?? 0) + xp;
  const goalMet = totalMinutes >= (profile.daily_goal_minutes as number);

  if (existing) {
    await supabase
      .from("daily_activity")
      .update({
        minutes: totalMinutes,
        xp: totalXp,
        exercises: (existing.exercises ?? 0) + exercises,
        goal_met: goalMet || existing.goal_met,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("daily_activity").insert({
      user_id: userId,
      day,
      minutes: totalMinutes,
      xp: totalXp,
      exercises,
      goal_met: goalMet,
    });
  }

  // ofensiva: conta o dia quando a meta e cumprida (escudos cobrem faltas)
  let streak = profile.streak_current as number;
  let shields = profile.shields as number;
  let last = (profile.last_active_date as string | null) ?? null;
  let shieldUsed = 0;

  if (goalMet && last !== day) {
    const gap = last ? dayDiff(last, day) : null;
    if (last === null) {
      streak = 1;
    } else if (gap === 1) {
      streak = streak + 1;
    } else if (gap !== null && gap > 1) {
      const missed = gap - 1;
      if (shields >= missed) {
        shields -= missed;
        shieldUsed = missed;
        streak = streak + 1;
      } else {
        streak = 1;
      }
    }
    last = day;
  }

  const { data: updated, error } = await supabase
    .from("learner_profiles")
    .update({
      points: (profile.points as number) + xp,
      xp_total: (profile.xp_total as number) + xp,
      streak_current: streak,
      streak_best: Math.max(profile.streak_best as number, streak),
      shields,
      last_active_date: last,
    })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const levelXp = await xpInCurrentLevel(supabase, userId, updated.level_started_at);
  return {
    ok: true as const,
    skipped: false as const,
    shieldUsed,
    goalMet,
    todayMinutes: totalMinutes,
    ...summarize(updated, levelXp),
  };
}

export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { minutes?: number; xp?: number; exercises?: number }) => d)
  .handler(async ({ data, context }) => applyActivity(context.supabase, context.userId, data));

export const buyShield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadOrCreateProfile(context.supabase, context.userId);
    if ((profile.shields as number) >= SHIELD_MAX)
      return { ok: false as const, reason: "max" as const };
    if ((profile.points as number) < SHIELD_COST)
      return { ok: false as const, reason: "points" as const, points: profile.points as number };
    const { data: updated, error } = await context.supabase
      .from("learner_profiles")
      .update({
        points: (profile.points as number) - SHIELD_COST,
        shields: (profile.shields as number) + 1,
      })
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, points: updated.points as number, shields: updated.shields as number };
  });

/* ------------------------------------------------------------------ */
/* exercises → pontos                                                 */
/* ------------------------------------------------------------------ */

export const gradeExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { question: string; expected?: string | null; answer: string; lessonTitle?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const result = await askAI(
      `You grade a single English exercise answer from a Brazilian-Portuguese speaker.
Reply ONLY with JSON: {"correct": boolean, "score": 0-10, "feedback": "1-2 short sentences in Portuguese", "corrected": "the correct English sentence"}`,
      JSON.stringify({
        lesson: data.lessonTitle ?? null,
        question: data.question,
        expectedAnswer: data.expected ?? null,
        studentAnswer: data.answer,
      }),
    );
    const correct = result?.correct === true;
    const score = Math.max(0, Math.min(10, Number(result?.score) || (correct ? 10 : 0)));
    const xp = correct ? 15 : 5;
    await applyActivity(context.supabase, context.userId, { xp, exercises: 1 });
    return {
      correct,
      score,
      xp,
      feedback: typeof result?.feedback === "string" ? result.feedback : "",
      corrected: typeof result?.corrected === "string" ? result.corrected : "",
    };
  });

/* ------------------------------------------------------------------ */
/* testes: nivelamento e passagem de nível                            */
/* ------------------------------------------------------------------ */

async function studentContext(supabase: any, userId: string) {
  const { data: corrections } = await supabase
    .from("messages")
    .select("content, correction")
    .eq("user_id", userId)
    .not("correction", "is", null)
    .order("created_at", { ascending: false })
    .limit(15);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("title, focus")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return {
    recentMistakes: (corrections ?? []).map((c: any) => String(c.correction).slice(0, 200)),
    lessonsStudied: (lessons ?? []).map((l: any) => `${l.title}${l.focus ? ` (${l.focus})` : ""}`),
  };
}

function coerceQuestions(raw: any): TestQuestion[] {
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  const out: TestQuestion[] = list
    .filter((q: any) => q && typeof q.prompt === "string" && q.prompt.trim())
    .slice(0, 9)
    .map((q: any, i: number) => ({
      id: `q-${i + 1}`,
      skill: ["reading", "grammar", "conversation"].includes(q.skill) ? q.skill : "grammar",
      prompt: String(q.prompt).trim(),
      passage: typeof q.passage === "string" && q.passage.trim() ? q.passage.trim() : undefined,
      expected: typeof q.expected === "string" && q.expected.trim() ? q.expected.trim() : undefined,
    }));
  return out;
}

export const startTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "placement" | "levelup" | "final" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadOrCreateProfile(supabase, userId);
    const level = asLevel(profile.level);
    const levelXp = await xpInCurrentLevel(supabase, userId, profile.level_started_at);
    const status = summarize(profile, levelXp);

    let target: Level | null = level;
    if (data.kind === "levelup") {
      if (!status.testUnlocked) return { started: false as const, reason: "locked" as const, status };
      target = status.nextLevel;
      if (!target) return { started: false as const, reason: "max_level" as const, status };
    } else if (data.kind === "final") {
      if (level !== "advanced") return { started: false as const, reason: "locked" as const, status };
      const { data: passedFinal } = await supabase
        .from("level_tests")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "final")
        .eq("status", "done")
        .eq("passed", true)
        .limit(1)
        .maybeSingle();
      if (passedFinal) return { started: false as const, reason: "already_passed" as const, status };
    }

    const ctx = data.kind === "placement" ? null : await studentContext(supabase, userId);

    const raw = await askAI(
      `You are an English ${data.kind === "final" ? "course completion" : "placement"} examiner for Brazilian-Portuguese speakers.
Build a short practical test with EXACTLY 6 questions: 2 reading (each with a short "passage" and a comprehension question), 2 grammar (fill-in / fix the sentence), 2 conversation (an open prompt the student answers in 1-3 English sentences).
All prompts in English, instructions may include a short Portuguese hint. Calibrate difficulty to the target level.
Reply ONLY with JSON: {"questions":[{"skill":"reading"|"grammar"|"conversation","passage":"optional","prompt":"...","expected":"expected answer or key points"}]}`,
      JSON.stringify({
        kind: data.kind,
        targetLevel: target,
        currentLevel: level,
        ...(ctx ?? {}),
      }),
    );
    const questions = coerceQuestions(raw);
    if (questions.length < 4) return { started: false as const, reason: "ai_failed" as const, status };

    const { data: row, error } = await supabase
      .from("level_tests")
      .insert({
        user_id: userId,
        kind: data.kind,
        from_level: level,
        to_level: target,
        questions: questions as unknown as any,
        status: "open",
      })
      .select("id, kind, from_level, to_level, questions")
      .single();
    if (error) throw new Error(error.message);

    return {
      started: true as const,
      test: {
        id: row.id as string,
        kind: row.kind as string,
        fromLevel: row.from_level as string,
        toLevel: row.to_level as string,
        questions: row.questions as unknown as TestQuestion[],
      },
    };
  });

export const submitTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { testId: string; answers: Array<{ id: string; answer: string }> }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: test, error } = await supabase
      .from("level_tests")
      .select("*")
      .eq("id", data.testId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!test) throw new Error("Teste não encontrado.");
    if (test.status === "done") throw new Error("Este teste já foi corrigido.");

    const questions = (test.questions ?? []) as TestQuestion[];
    const answered = questions.map((q) => ({
      skill: q.skill,
      prompt: q.prompt,
      passage: q.passage ?? null,
      expected: q.expected ?? null,
      answer: (data.answers.find((a) => a.id === q.id)?.answer ?? "").slice(0, 1200),
    }));

    const result = await askAI(
      `You grade an English test for a Brazilian-Portuguese speaker.
Score each skill 0-100 and give an overall score 0-100. Be strict but fair; ignore punctuation and accents.
Also state the CEFR-mapped level the student really belongs to, from: beginner, elementary, intermediate, advanced.
Reply ONLY with JSON: {"score":0-100,"reading":0-100,"grammar":0-100,"conversation":0-100,"recommendedLevel":"beginner|elementary|intermediate|advanced","feedback":"3-5 sentences in Portuguese with what to improve"}`,
      JSON.stringify({
        kind: test.kind,
        fromLevel: test.from_level,
        targetLevel: test.to_level,
        answers: answered,
      }),
    );

    const score = Math.max(0, Math.min(100, Math.round(Number(result?.score) || 0)));
    const feedback = typeof result?.feedback === "string" ? result.feedback : "";
    const recommended = asLevel(result?.recommendedLevel);
    const passed = test.kind === "placement" ? true : score >= PASS_SCORE;

    await supabase
      .from("level_tests")
      .update({
        answers: answered as unknown as any,
        score,
        passed,
        feedback,
        status: "done",
      })
      .eq("id", test.id);

    const profile = await loadOrCreateProfile(supabase, userId);
    const update: Record<string, unknown> = {
      points: (profile.points as number) + (passed ? 100 : 25),
      xp_total: (profile.xp_total as number) + (passed ? 100 : 25),
    };

    if (test.kind === "placement") {
      update["level"] = recommended;
      update["placement_done"] = true;
      update["level_started_at"] = new Date().toISOString();
    } else if (test.kind === "levelup" && passed && test.to_level) {
      update["level"] = asLevel(test.to_level);
      update["level_started_at"] = new Date().toISOString();
    }

    const { data: updated } = await supabase
      .from("learner_profiles")
      .update(update as any)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (!updated) throw new Error("Não foi possível atualizar o seu nível.");

    const levelXp = await xpInCurrentLevel(supabase, userId, updated.level_started_at);

    return {
      score,
      passed,
      feedback,
      recommendedLevel: recommended,
      skills: {
        reading: Math.round(Number(result?.reading) || 0),
        grammar: Math.round(Number(result?.grammar) || 0),
        conversation: Math.round(Number(result?.conversation) || 0),
      },
      kind: test.kind as "placement" | "levelup" | "final",
      status: summarize(updated, levelXp),
    };
  });

export const listTestHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("level_tests")
      .select("id, kind, from_level, to_level, score, passed, feedback, created_at, status")
      .eq("user_id", context.userId)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
