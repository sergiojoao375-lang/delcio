import { fetchWithRetry } from "@/lib/api-client";
import { DEFAULT_VOICE_ID } from "@/lib/voices";

let current: HTMLAudioElement | null = null;

export async function speakText(text: string, rate = 1) {
  const cleaned = text.replace(/[✏️🎉🌐⚠️]/g, "").trim();
  if (!cleaned) return;
  current?.pause();
  const res = await fetchWithRetry(
    "/api/tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned.slice(0, 600), voiceId: DEFAULT_VOICE_ID }),
    },
    { timeoutMs: 45_000 },
  );
  if (!res.ok) return;
  const audio = new Audio(URL.createObjectURL(await res.blob()));
  audio.playbackRate = rate;
  current = audio;
  await audio.play();
}
