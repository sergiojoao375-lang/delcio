export type OfflineLesson = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  body: string;
  exercises: { id: string; question: string; answer?: string | null; hint?: string | null }[];
  hasAudio: boolean;
  savedAt: string;
};

const KEY = "delcio.offlineLessons";
const AUDIO_CACHE = "delcio-lesson-audio";
const audioKey = (id: string) => `/offline-audio/${id}`;

export function listOfflineLessons(): OfflineLesson[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as OfflineLesson[];
  } catch {
    return [];
  }
}

export function getOfflineLesson(id: string) {
  return listOfflineLessons().find((l) => l.id === id) ?? null;
}

export function isLessonSaved(id: string) {
  return listOfflineLessons().some((l) => l.id === id);
}

export async function saveLessonOffline(
  lesson: Omit<OfflineLesson, "hasAudio" | "savedAt">,
  audioSrc: string | null,
) {
  let hasAudio = false;
  if (audioSrc && "caches" in window) {
    try {
      const res = await fetch(audioSrc);
      if (res.ok) {
        const cache = await caches.open(AUDIO_CACHE);
        await cache.put(audioKey(lesson.id), new Response(await res.blob()));
        hasAudio = true;
      }
    } catch {
      /* áudio opcional */
    }
  }
  const rest = listOfflineLessons().filter((l) => l.id !== lesson.id);
  rest.unshift({ ...lesson, hasAudio, savedAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(rest));
}

export async function removeOfflineLesson(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listOfflineLessons().filter((l) => l.id !== id)));
  if ("caches" in window) {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      await cache.delete(audioKey(id));
    } catch {
      /* ignore */
    }
  }
}

export async function getOfflineAudioUrl(id: string): Promise<string | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(AUDIO_CACHE);
  const res = await cache.match(audioKey(id));
  return res ? URL.createObjectURL(await res.blob()) : null;
}

/** Correção simples offline: compara com a resposta esperada. */
export function checkOffline(answer: string, expected?: string | null) {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, "").replace(/\s+/g, " ").trim();
  if (!expected) return null;
  return norm(answer) === norm(expected);
}
