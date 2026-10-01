import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Mic, Square, Volume2, Turtle } from "lucide-react";
import { speakText } from "@/lib/tts-client";
import { recordActivity } from "@/lib/learning.functions";

const PHRASES = [
  "I would like a cup of coffee, please.",
  "Could you tell me where the station is?",
  "I have been working here for three years.",
  "The weather is beautiful this morning.",
  "Thank you very much for your help.",
  "What time does the next train leave?",
  "I think this is a really good idea.",
  "She usually walks to work on Thursdays.",
];

export const Route = createFileRoute("/_authenticated/pronuncia")({
  head: () => ({
    meta: [
      { title: "Treino de pronúncia — Delcio-English" },
      { name: "description", content: "Grave a sua voz e veja quais palavras precisa de pronunciar melhor." },
      { property: "og:title", content: "Treino de pronúncia — Delcio-English" },
      { property: "og:description", content: "Feedback de pronúncia palavra por palavra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PronunciationPage,
});

const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

function PronunciationPage() {
  const [idx, setIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const phrase = PHRASES[idx] ?? PHRASES[0]!;
  const targetWords = phrase.split(" ");
  const heardSet = new Set((heard ?? "").split(/\s+/).map(norm));
  const results = targetWords.map((w) => ({ w, ok: heardSet.has(norm(w)) }));
  const score = heard ? Math.round((results.filter((r) => r.ok).length / results.length) * 100) : 0;

  async function start() {
    setErr(null);
    setHeard(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append("file", new Blob(chunks, { type: rec.mimeType }), "rec.webm");
          fd.append("language", "en");
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          const j = (await res.json()) as { text?: string };
          setHeard(j.text ?? "");
          void recordActivity({ data: { xp: 5, exercises: 1 } }).catch(() => {});
        } catch {
          setErr("Não consegui ouvir. Tente de novo.");
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setErr("Permita o uso do microfone para treinar a pronúncia.");
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to="/" className="text-sm text-primary hover:underline">← Início</Link>
        <h1 className="text-2xl font-bold text-primary-dark">Treino de pronúncia</h1>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs text-muted-foreground">Frase {idx + 1} de {PHRASES.length}</p>
          <p className="mt-3 text-xl font-semibold">
            {heard !== null
              ? results.map((r, i) => (
                  <span key={i} className={r.ok ? "text-primary-dark" : "text-destructive underline decoration-wavy"}>
                    {r.w}{" "}
                  </span>
                ))
              : phrase}
          </p>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <button onClick={() => void speakText(phrase)} className="inline-flex items-center gap-1 text-primary hover:underline"><Volume2 className="h-4 w-4" /> Ouvir</button>
            <button onClick={() => void speakText(phrase, 0.65)} className="inline-flex items-center gap-1 text-primary hover:underline"><Turtle className="h-4 w-4" /> Devagar</button>
          </div>
          <button
            onClick={recording ? stop : () => void start()}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60"
          >
            {recording ? <><Square className="h-4 w-4" /> Parar</> : <><Mic className="h-4 w-4" /> {busy ? "A analisar…" : "Gravar"}</>}
          </button>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          {heard !== null && (
            <div className="mt-4 text-sm">
              <p className="font-medium">Pronúncia: {score}%</p>
              <p className="text-muted-foreground">Ouvi: “{heard || "…"}”</p>
              {results.some((r) => !r.ok) && (
                <p className="mt-2">Treine as palavras sublinhadas — toque para ouvir devagar:{" "}
                  {results.filter((r) => !r.ok).map((r, i) => (
                    <button key={i} onClick={() => void speakText(r.w, 0.6)} className="mx-1 rounded bg-secondary px-2 py-0.5">{r.w}</button>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>
        <button onClick={() => { setIdx((idx + 1) % PHRASES.length); setHeard(null); }} className="w-full rounded-xl bg-secondary py-2 font-medium">
          Próxima frase →
        </button>
      </div>
    </main>
  );
}
