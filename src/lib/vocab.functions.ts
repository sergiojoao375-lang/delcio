import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];

export const listVocab = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vocab_items")
      .select("id, correction, box, due_at, created_at")
      .order("due_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    const now = Date.now();
    const items = (data ?? []).map((v) => {
      const [front, ...rest] = v.correction.split(" — ");
      return {
        id: v.id,
        phrase: (front ?? v.correction).trim(),
        explanation: rest.join(" — ").trim(),
        box: v.box,
        due: new Date(v.due_at).getTime() <= now,
      };
    });
    return { items };
  });

export const reviewVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; knew: boolean; box: number }) => d)
  .handler(async ({ data, context }) => {
    const box = data.knew ? Math.min(data.box + 1, INTERVALS_DAYS.length - 1) : 0;
    const days = INTERVALS_DAYS[box] ?? 1;
    const due = new Date(Date.now() + Math.max(days, data.knew ? 1 : 0) * 86400000 + (data.knew ? 0 : 600000));
    const { error } = await context.supabase
      .from("vocab_items")
      .update({ box, due_at: due.toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.from("vocab_items").delete().eq("id", data.id);
    return { ok: true };
  });
