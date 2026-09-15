import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LessonExercise = {
  id: string;
  question: string;
  answer?: string;
  hint?: string;
};

export type Lesson = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  body: string;
  audio_url: string | null;
  exercises: LessonExercise[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

function parseExercises(value: unknown): LessonExercise[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any, i: number) => ({
      id: typeof item.id === "string" ? item.id : `ex-${i}`,
      question: typeof item.question === "string" ? item.question : "",
      answer: typeof item.answer === "string" ? item.answer : undefined,
      hint: typeof item.hint === "string" ? item.hint : undefined,
    }))
    .filter((e) => e.question.trim().length > 0);
}

function mapLesson(row: any): Lesson {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    level: row.level,
    language: row.language,
    body: row.body ?? "",
    audio_url: row.audio_url ?? null,
    exercises: parseExercises(row.exercises),
    published: !!row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* ---------------- roles ---------------- */

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      isAdmin: data === true,
      displayName: (profile?.display_name as string | null) ?? null,
    };
  });

export const saveDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { displayName: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, display_name: data.displayName.slice(0, 60) });
    return { ok: true };
  });

/* ---------------- lessons ---------------- */

export const listLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLesson);
  });

export const getLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lessons")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return mapLesson(row);
  });

export const saveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string | null;
      title: string;
      description?: string;
      level: string;
      language: string;
      body: string;
      audio_url?: string | null;
      exercises: LessonExercise[];
      published: boolean;
    }) => d
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Sem permissão de administrador.");

    const payload = {
      title: data.title.trim().slice(0, 160),
      description: (data.description ?? "").trim() || null,
      level: data.level,
      language: data.language,
      body: data.body,
      audio_url: data.audio_url || null,
      exercises: data.exercises as unknown as any,
      published: data.published,
      created_by: context.userId,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("lessons")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapLesson(row);
    }

    const { data: row, error } = await context.supabase
      .from("lessons")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapLesson(row);
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- conversations ---------------- */

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { title: string; learningLang: string; lessonId?: string | null }) => d
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .insert({
        user_id: context.userId,
        title: data.title.slice(0, 120) || "Nova aula",
        learning_lang: data.learningLang,
        lesson_id: data.lessonId || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const addMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      conversationId: string;
      role: "user" | "assistant";
      content: string;
      correction?: string | null;
      translation?: string | null;
    }) => d
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: context.userId,
      role: data.role,
      content: data.content,
      correction: data.correction || null,
      translation: data.translation || null,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, learning_lang, lesson_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("conversations")
      .select("id, title, learning_lang, lesson_id, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) return null;
    const { data: msgs } = await context.supabase
      .from("messages")
      .select("id, role, content, correction, translation, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    return { conversation: conv, messages: msgs ?? [] };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
