import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteLesson,
  getMyAccess,
  listLessons,
  saveLesson,
  type Lesson,
  type LessonExercise,
} from "@/lib/db.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel de aulas — Delcio-English" },
      {
        name: "description",
        content: "Cadastre aulas com texto, áudio e exercícios que aparecem no chat do professor virtual.",
      },
      { property: "og:title", content: "Painel de aulas — Delcio-English" },
      { property: "og:description", content: "Cadastro de aulas do Delcio-English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
  errorComponent: () => (
    <main className="p-8 text-center text-muted-foreground">Não foi possível abrir o painel.</main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

function emptyExercise(): LessonExercise {
  return { id: Math.random().toString(36).slice(2, 10), question: "", answer: "", hint: "" };
}

function AdminPage() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Iniciante");
  const [language, setLanguage] = useState("en");
  const [body, setBody] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [exercises, setExercises] = useState<LessonExercise[]>([emptyExercise()]);
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLessons(await listLessons());
  }

  useEffect(() => {
    (async () => {
      try {
        const access = await getMyAccess();
        setIsAdmin(access.isAdmin);
        if (access.isAdmin) await refresh();
      } catch {
        setIsAdmin(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function reset() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLevel("Iniciante");
    setLanguage("en");
    setBody("");
    setAudioUrl(null);
    setExercises([emptyExercise()]);
    setPublished(true);
  }

  function edit(lesson: Lesson) {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setDescription(lesson.description ?? "");
    setLevel(lesson.level);
    setLanguage(lesson.language);
    setBody(lesson.body);
    setAudioUrl(lesson.audio_url);
    setExercises(lesson.exercises.length ? lesson.exercises : [emptyExercise()]);
    setPublished(lesson.published);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadAudio(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("lesson-audio").upload(path, file, {
        contentType: file.type || "audio/mpeg",
      });
      if (error) throw error;
      setAudioUrl(path);
      setMsg("Áudio enviado.");
    } catch (e: any) {
      setErr(e?.message || "Não foi possível enviar o áudio.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await saveLesson({
        data: {
          id: editingId,
          title,
          description,
          level,
          language,
          body,
          audio_url: audioUrl,
          exercises: exercises.filter((x) => x.question.trim()),
          published,
        },
      });
      setMsg(editingId ? "Aula atualizada." : "Aula criada.");
      reset();
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Não foi possível salvar a aula.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteLesson({ data: { id } });
      if (editingId === id) reset();
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Não foi possível apagar a aula.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <main className="p-8 text-center text-muted-foreground">Carregando…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold text-primary-dark">Área restrita</h1>
        <p className="text-muted-foreground">Esta página é só para administradores.</p>
        <Link to="/" className="text-primary hover:underline">
          Voltar ao chat
        </Link>
      </main>
    );
  }

  const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2";

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">Painel de aulas</h1>
          <div className="flex gap-3 text-sm">
            <Link to="/aulas" className="text-primary hover:underline">
              Ver aulas
            </Link>
            <Link to="/" className="text-primary hover:underline">
              Chat
            </Link>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-primary-dark">
            {editingId ? "Editar aula" : "Nova aula"}
          </h2>

          <div>
            <label htmlFor="t" className="mb-1 block text-sm font-medium">
              Título
            </label>
            <input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="d" className="mb-1 block text-sm font-medium">
              Resumo (opcional)
            </label>
            <input id="d" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="l" className="mb-1 block text-sm font-medium">
                Nível
              </label>
              <select id="l" value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass}>
                <option>Iniciante</option>
                <option>Intermediário</option>
                <option>Avançado</option>
              </select>
            </div>
            <div>
              <label htmlFor="lang" className="mb-1 block text-sm font-medium">
                Idioma da aula
              </label>
              <select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                <option value="en">Inglês</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="b" className="mb-1 block text-sm font-medium">
              Texto da aula
            </label>
            <textarea
              id="b"
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium">Áudio da aula</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" />
              {audioUrl ? "Trocar áudio" : "Escolher arquivo"}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAudio(f);
                }}
              />
            </label>
            {audioUrl && (
              <button
                type="button"
                onClick={() => setAudioUrl(null)}
                className="ml-3 text-sm text-destructive hover:underline"
              >
                Remover áudio
              </button>
            )}
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium">Exercícios</span>
            {exercises.map((ex, i) => (
              <div key={ex.id} className="space-y-2 rounded-xl bg-secondary p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Exercício {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setExercises(exercises.filter((x) => x.id !== ex.id))}
                    className="text-destructive"
                    aria-label={`Remover exercício ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  placeholder="Pergunta"
                  value={ex.question}
                  onChange={(e) =>
                    setExercises(exercises.map((x) => (x.id === ex.id ? { ...x, question: e.target.value } : x)))
                  }
                  className={inputClass}
                />
                <input
                  placeholder="Resposta esperada (opcional)"
                  value={ex.answer ?? ""}
                  onChange={(e) =>
                    setExercises(exercises.map((x) => (x.id === ex.id ? { ...x, answer: e.target.value } : x)))
                  }
                  className={inputClass}
                />
                <input
                  placeholder="Dica (opcional)"
                  value={ex.hint ?? ""}
                  onChange={(e) =>
                    setExercises(exercises.map((x) => (x.id === ex.id ? { ...x, hint: e.target.value } : x)))
                  }
                  className={inputClass}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExercises([...exercises, emptyExercise()])}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Adicionar exercício
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publicar (visível para os alunos)
          </label>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary-dark">{msg}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Salvando…" : editingId ? "Salvar alterações" : "Criar aula"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-xl border border-input px-5 py-2.5">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-primary-dark">Aulas cadastradas</h2>
          {lessons.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma aula ainda.</p>
          )}
          <ul className="mt-3 space-y-2">
            {lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.level} · {lesson.published ? "publicada" : "rascunho"} ·{" "}
                    {lesson.exercises.length} exercícios
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  <button onClick={() => edit(lesson)} className="text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => remove(lesson.id)} className="text-destructive hover:underline">
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
