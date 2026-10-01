import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Volume2, Trash2 } from "lucide-react";
import { listVocab, reviewVocab, deleteVocab } from "@/lib/vocab.functions";
import { speakText } from "@/lib/tts-client";
import { recordActivity } from "@/lib/learning.functions";

export const Route = createFileRoute("/_authenticated/vocabulario")({
  head: () => ({
    meta: [
      { title: "Banco de palavras — Delcio-English" },
      { name: "description", content: "Revise com flashcards as frases que o professor corrigiu." },
      { property: "og:title", content: "Banco de palavras — Delcio-English" },
      { property: "og:description", content: "Flashcards dos seus erros para não os repetir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VocabPage,
});

function VocabPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["vocab"], queryFn: () => listVocab() });
  const [flipped, setFlipped] = useState(false);
  const items = data?.items ?? [];
  const due = items.filter((i) => i.due);
  const card = due[0];

  async function answer(knew: boolean) {
    if (!card) return;
    setFlipped(false);
    await reviewVocab({ data: { id: card.id, knew, box: card.box } });
    void recordActivity({ data: { xp: knew ? 5 : 2 } }).catch(() => {});
    await qc.invalidateQueries({ queryKey: ["vocab"] });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/" className="text-sm text-primary hover:underline">← Início</Link>
        <h1 className="text-2xl font-bold text-primary-dark">Banco de palavras</h1>
        <p className="text-muted-foreground">Cada correção do Delcio vira um cartão. Revise alguns minutos por dia.</p>

        {isLoading ? (
          <p className="text-muted-foreground">A carregar…</p>
        ) : card ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-xs text-muted-foreground">{due.length} para revisar hoje</p>
            <p className="mt-4 text-xl font-semibold text-primary-dark">{card.phrase}</p>
            <button onClick={() => void speakText(card.phrase, 0.8)} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Volume2 className="h-4 w-4" /> Ouvir
            </button>
            {flipped ? (
              <>
                <p className="mt-4 text-sm text-muted-foreground">{card.explanation || "Repita a frase em voz alta."}</p>
                <div className="mt-5 flex justify-center gap-3">
                  <button onClick={() => void answer(false)} className="rounded-xl bg-secondary px-4 py-2 font-medium">Ainda não sei</button>
                  <button onClick={() => void answer(true)} className="rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground">Já sei</button>
                </div>
              </>
            ) : (
              <button onClick={() => setFlipped(true)} className="mt-5 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground">Ver explicação</button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            {items.length ? "Tudo revisado por hoje! 🎉" : "Ainda não há palavras. Converse com o Delcio — cada correção aparece aqui."}
          </div>
        )}

        {items.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-primary-dark">Todas as palavras ({items.length})</h2>
            <ul className="mt-3 divide-y divide-border">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{i.phrase}</span>
                  <span className="flex shrink-0 gap-2">
                    <button aria-label="Ouvir" onClick={() => void speakText(i.phrase, 0.8)}><Volume2 className="h-4 w-4 text-primary" /></button>
                    <button aria-label="Apagar" onClick={async () => { await deleteVocab({ data: { id: i.id } }); await qc.invalidateQueries({ queryKey: ["vocab"] }); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
