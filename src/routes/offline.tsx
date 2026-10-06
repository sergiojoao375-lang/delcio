import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, WifiOff } from "lucide-react";
import {
  checkOffline,
  getOfflineAudioUrl,
  listOfflineLessons,
  removeOfflineLesson,
  type OfflineLesson,
} from "@/lib/offline-lessons";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Aulas guardadas offline — Delcio-English" },
      { name: "description", content: "Estude as aulas que guardou no seu telefone, mesmo sem internet." },
      { property: "og:title", content: "Aulas guardadas offline — Delcio-English" },
      { property: "og:description", content: "Leia, ouça e pratique as suas aulas sem ligação à internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

function Exercise({ q, expected }: { q: string; expected?: string | null }) {
  const [a, setA] = useState("");
  const [res, setRes] = useState<boolean | null | undefined>(undefined);
  return (
    <li className="rounded-xl bg-secondary p-3">
      <p className="text-sm font-medium">{q}</p>
      <div className="mt-2 flex gap-2">
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Sua resposta"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <button type="button" onClick={() => setRes(checkOffline(a, expected))} disabled={!a.trim()}
          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          Verificar
        </button>
      </div>
      {res === true && <p className="mt-1 text-xs">✅ Correto!</p>}
      {res === false && <p className="mt-1 text-xs">✏️ Quase. Resposta esperada: {expected}</p>}
      {res === null && <p className="mt-1 text-xs text-muted-foreground">Sem resposta fixa — o Delcio corrige quando voltar a internet.</p>}
    </li>
  );
}

function LessonView({ lesson }: { lesson: OfflineLesson }) {
  const [audio, setAudio] = useState<string | null>(null);
  useEffect(() => {
    if (lesson.hasAudio) void getOfflineAudioUrl(lesson.id).then(setAudio);
  }, [lesson]);
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold text-primary-dark">{lesson.title}</h2>
      {lesson.description && <p className="text-muted-foreground">{lesson.description}</p>}
      {audio && <audio controls src={audio} className="w-full" />}
      <div className="whitespace-pre-wrap leading-relaxed">{lesson.body}</div>
      {lesson.exercises.length > 0 && (
        <ol className="space-y-3">
          {lesson.exercises.map((e) => <Exercise key={e.id} q={e.question} expected={e.answer ?? null} />)}
        </ol>
      )}
    </article>
  );
}

function OfflinePage() {
  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => setLessons(listOfflineLessons()), []);
  const current = lessons.find((l) => l.id === openId);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">← Início</Link>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" /> Funciona sem internet</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-dark">Aulas guardadas</h1>
        {current ? (
          <>
            <button onClick={() => setOpenId(null)} className="text-sm text-primary hover:underline">← Voltar à lista</button>
            <LessonView lesson={current} />
          </>
        ) : lessons.length === 0 ? (
          <p className="text-muted-foreground">Ainda não guardou aulas. Abra uma aula e toque em "Guardar offline".</p>
        ) : (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <button onClick={() => setOpenId(l.id)} className="flex-1 text-left">
                  <p className="font-semibold">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.level} · {l.exercises.length} exercícios{l.hasAudio ? " · com áudio" : ""}</p>
                </button>
                <button aria-label="Remover" onClick={async () => { await removeOfflineLesson(l.id); setLessons(listOfflineLessons()); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
