import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { deleteConversation, getConversation, listConversations } from "@/lib/db.functions";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Minhas aulas anteriores — Delcio-English" },
      {
        name: "description",
        content: "Revisite as conversas que você teve com o professor virtual Delcio, com as correções guardadas.",
      },
      { property: "og:title", content: "Minhas aulas anteriores — Delcio-English" },
      { property: "og:description", content: "Histórico das suas conversas de inglês com o Delcio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
  errorComponent: () => (
    <main className="p-8 text-center text-muted-foreground">Não foi possível abrir o histórico.</main>
  ),
  notFoundComponent: () => <main className="p-8 text-center">Nada aqui.</main>,
});

type Row = {
  id: string;
  title: string;
  learning_lang: string;
  lesson_id: string | null;
  created_at: string;
  updated_at: string;
};

type Msg = {
  id: string;
  role: string;
  content: string;
  correction: string | null;
  created_at: string;
};

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  async function refresh() {
    const data = await listConversations();
    setRows(data as unknown as Row[]);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function open(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setLoadingMsgs(true);
    try {
      const result = await getConversation({ data: { id } });
      setMsgs((result?.messages ?? []) as unknown as Msg[]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function remove(id: string) {
    await deleteConversation({ data: { id } });
    if (openId === id) setOpenId(null);
    await refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-dark">Minhas aulas anteriores</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            Voltar ao chat
          </Link>
        </div>

        {loading && <p className="text-muted-foreground">Carregando…</p>}

        {!loading && rows.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            Você ainda não tem conversas guardadas. Fale com o Delcio e elas aparecem aqui.
          </p>
        )}

        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => open(row.id)} className="min-w-0 text-left">
                  <p className="truncate font-semibold text-primary-dark">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.updated_at).toLocaleString("pt-BR")} ·{" "}
                    {row.learning_lang === "pt" ? "Português" : "Inglês"}
                  </p>
                </button>
                <div className="flex shrink-0 gap-3 text-sm">
                  <button onClick={() => open(row.id)} className="text-primary hover:underline">
                    {openId === row.id ? "Fechar" : "Ver"}
                  </button>
                  <button onClick={() => remove(row.id)} className="text-destructive hover:underline">
                    Apagar
                  </button>
                </div>
              </div>

              {openId === row.id && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {loadingMsgs && <p className="text-sm text-muted-foreground">Carregando…</p>}
                  {!loadingMsgs && msgs.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                  )}
                  {msgs.map((m) => (
                    <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                      {m.correction && (
                        <div className="mb-1 inline-block rounded-xl bg-accent px-3 py-1.5 text-left text-sm">
                          ✏️ {m.correction}
                        </div>
                      )}
                      <div
                        className={
                          m.role === "user"
                            ? "inline-block max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-left text-sm text-primary-foreground"
                            : "inline-block max-w-[85%] rounded-2xl bg-secondary px-4 py-2 text-left text-sm"
                        }
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
