import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getLesson } from "@/lib/db.functions";
import { supabase } from "@/integrations/supabase/client";
import { TeacherChat } from "@/components/teacher-chat";

const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ["lesson", id],
    queryFn: () => getLesson({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/aulas/$id")({
  head: () => ({
    meta: [
      { title: "Aula — Delcio-English" },
      {
        name: "description",
        content: "Leia, ouça o áudio, responda aos exercícios e converse com o professor virtual.",
      },
      { property: "og:title", content: "Aula — Delcio-English" },
      {
        property: "og:description",
        content: "Texto, áudio e exercícios com correção do professor virtual Delcio.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const lesson = await context.queryClient.ensureQueryData(lessonQuery(params.id));
    if (!lesson) throw notFound();
    return lesson;
  },
  component: LessonPage,
  errorComponent: () => (
    <main className="p-8 text-center">
      <p className="text-muted-foreground">Não foi possível carregar esta aula.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="p-8 text-center">
      <p className="text-muted-foreground">Aula não encontrada.</p>
    </main>
  ),
});

function useAudioSrc(audioUrl: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!audioUrl) {
      setSrc(null);
      return;
    }
    if (/^https?:\/\//.test(audioUrl)) {
      setSrc(audioUrl);
      return;
    }
    supabase.storage
      .from("lesson-audio")
      .createSignedUrl(audioUrl, 3600)
      .then(({ data }) => {
        if (active) setSrc(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [audioUrl]);
  return src;
}

function LessonPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(lessonQuery(id));
  const lesson = data!;
  const audioSrc = useAudioSrc(lesson.audio_url);
  const [name, setName] = useState("amigo");

  useEffect(() => {
    const stored = localStorage.getItem("delcio.name");
    if (stored) setName(stored);
  }, []);

  const lessonContext = [
    `Lesson title: ${lesson.title}`,
    lesson.description ? `Summary: ${lesson.description}` : "",
    `Level: ${lesson.level}`,
    `Lesson text:\n${lesson.body}`,
    lesson.exercises.length
      ? `Exercises:\n${lesson.exercises
          .map((e, i) => `${i + 1}. ${e.question}${e.answer ? ` (expected: ${e.answer})` : ""}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/aulas" className="text-sm text-primary hover:underline">
            ← Todas as aulas
          </Link>
          <Link to="/" className="text-sm text-primary hover:underline">
            Chat livre
          </Link>
        </div>

        <article className="rounded-2xl border border-border bg-card p-5">
          <h1 className="text-2xl font-bold text-primary-dark">{lesson.title}</h1>
          {lesson.description && <p className="mt-1 text-muted-foreground">{lesson.description}</p>}
          <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-primary-dark">{lesson.level}</span>
            <span>{lesson.language === "en" ? "Inglês" : "Português"}</span>
          </div>

          {audioSrc && (
            <audio controls src={audioSrc} className="mt-4 w-full">
              O seu navegador não suporta áudio.
            </audio>
          )}

          <div className="mt-4 whitespace-pre-wrap leading-relaxed">{lesson.body}</div>
        </article>

        {lesson.exercises.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-primary-dark">Exercícios</h2>
            <ol className="mt-3 space-y-3">
              {lesson.exercises.map((ex, i) => (
                <li key={ex.id} className="rounded-xl bg-secondary p-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {ex.question}
                  </p>
                  {ex.hint && <p className="mt-1 text-xs text-muted-foreground">Dica: {ex.hint}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Responda no chat abaixo — o Delcio corrige na hora.
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <TeacherChat
          userName={name}
          learningLang={lesson.language === "pt" ? "pt" : "en"}
          lessonContext={lessonContext}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          starter={
            lesson.language === "pt"
              ? `Vamos começar esta aula: ${lesson.title}. Me faça a primeira pergunta.`
              : `Let's start this lesson: ${lesson.title}. Ask me the first question.`
          }
        />
      </div>
    </main>
  );
}
