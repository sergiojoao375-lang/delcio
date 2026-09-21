import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LessonExercise } from "@/lib/db.functions";

const MIN_CORRECTIONS_AUTO = 5;
const MIN_CORRECTIONS_MANUAL = 2;

type Generated = {
  title: string;
  description: string;
  level: string;
  focus: string;
  body: string;
  exercises: LessonExercise[];
};

function coerce(raw: string): Generated | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  if (!title || !body) return null;
  const exercises: LessonExercise[] = Array.isArray(parsed.exercises)
    ? parsed.exercises
        .filter((e: any) => e && typeof e.question === "string" && e.question.trim())
        .slice(0, 8)
        .map((e: any, i: number) => ({
          id: `ex-${i + 1}`,
          question: String(e.question).trim(),
          answer: typeof e.answer === "string" ? e.answer.trim() : undefined,
          hint: typeof e.hint === "string" ? e.hint.trim() : undefined,
        }))
    : [];
  const level = ["Iniciante", "Intermediário", "Avançado"].includes(parsed.level)
    ? parsed.level
    : "Iniciante";
  return {
    title: title.slice(0, 160),
    description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 300) : "",
    level,
    focus: typeof parsed.focus === "string" ? parsed.focus.trim().slice(0, 300) : "",
    body,
    exercises,
  };
}

async function askAI(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("IA indisponível no momento.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a curriculum designer for a Brazilian-Portuguese speaker learning English.
You receive the student's recent mistakes (each with the teacher's correction).
Create ONE personalized lesson targeting those exact mistakes.
Reply with ONLY a JSON object, no markdown:
{
  "title": "short lesson title in Portuguese",
  "description": "one sentence in Portuguese saying which mistakes this lesson fixes",
  "level": "Iniciante" | "Intermediário" | "Avançado",
  "focus": "comma-separated grammar/vocabulary points in Portuguese",
  "body": "the lesson text in Markdown: short explanation in Portuguese, English example sentences, and a mini vocabulary list. 200-450 words.",
  "exercises": [{ "question": "exercise prompt (English sentence to fix/complete)", "answer": "expected answer", "hint": "short hint in Portuguese" }]
}
Include 4 to 6 exercises derived from the student's real mistakes.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Muitas solicitações. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha ao gerar aula: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Generates a personalized lesson from the student's conversation corrections.
 * `force: true` (button) uses a lower threshold; otherwise it only runs when
 * enough new corrections piled up since the last generated lesson.
 */
export const generateLessonFromHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { force?: boolean } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const force = data.force === true;

    const { data: lastAuto } = await supabase
      .from("lessons")
      .select("created_at")
      .eq("owner_id", userId)
      .eq("source", "auto")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let query = supabase
      .from("messages")
      .select("content, correction, created_at")
      .eq("user_id", userId)
      .not("correction", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (lastAuto?.created_at) query = query.gt("created_at", lastAuto.created_at);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const corrections = (rows ?? []).filter((r) => (r.correction ?? "").trim().length > 0);
    const min = force ? MIN_CORRECTIONS_MANUAL : MIN_CORRECTIONS_AUTO;
    if (corrections.length < min) {
      return { created: false as const, reason: "not_enough" as const, count: corrections.length, min };
    }

    const prompt = corrections
      .slice()
      .reverse()
      .map((r, i) => `${i + 1}. Correção do professor: ${String(r.correction).trim().slice(0, 300)}`)
      .join("\n")
      .slice(0, 6000);

    const generated = coerce(await askAI(prompt));
    if (!generated) return { created: false as const, reason: "ai_failed" as const };

    const { data: row, error: insErr } = await supabase
      .from("lessons")
      .insert({
        title: generated.title,
        description: generated.description || null,
        level: generated.level,
        language: "en",
        body: generated.body,
        exercises: generated.exercises as unknown as any,
        published: true,
        owner_id: userId,
        source: "auto",
        focus: generated.focus || null,
        created_by: userId,
      })
      .select("id, title")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { created: true as const, id: row.id as string, title: row.title as string };
  });
