import { useEffect, useRef, useState } from "react";
import { Send, Volume2 } from "lucide-react";
import { fetchWithRetry } from "@/lib/api-client";
import { DEFAULT_VOICE_ID } from "@/lib/voices";
import { addMessage, createConversation } from "@/lib/db.functions";

type Turn = { id: string; role: "user" | "assistant"; text: string; correction?: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function stripScore(content: string) {
  const clean = content.replace(/<score>[\s\S]*?<\/score>/gi, "").trim();
  return clean;
}

function splitCorrection(text: string): { correction?: string; rest: string } {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.trim().startsWith("✏️"));
  if (idx === -1) return { rest: text };
  const correction = lines[idx].replace(/^✏️\s*/, "").trim();
  const rest = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { correction, rest };
}

export function TeacherChat({
  userName,
  learningLang,
  lessonContext,
  lessonId,
  lessonTitle,
  starter,
  voiceId = DEFAULT_VOICE_ID,
}: {
  userName: string;
  learningLang: "en" | "pt";
  lessonContext?: string;
  lessonId?: string;
  lessonTitle?: string;
  starter?: string;
  voiceId?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function ensureConversation() {
    if (conversationIdRef.current) return conversationIdRef.current;
    try {
      const { id } = await createConversation({
        data: {
          title: lessonTitle ? `Aula: ${lessonTitle}` : "Conversa com o Delcio",
          learningLang,
          lessonId: lessonId ?? null,
        },
      });
      conversationIdRef.current = id;
      return id;
    } catch {
      return null;
    }
  }

  async function persist(
    role: "user" | "assistant",
    content: string,
    correction?: string | null
  ) {
    const id = await ensureConversation();
    if (!id) return;
    try {
      await addMessage({
        data: { conversationId: id, role, content, correction: correction ?? null },
      });
    } catch {
      /* histórico é opcional */
    }
  }

  async function speak(text: string) {
    const cleaned = text.replace(/[✏️🎉🌐⚠️]/g, "").trim();
    if (!cleaned) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const res = await fetchWithRetry(
        "/api/tts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned.slice(0, 1200), voiceId }),
        },
        { timeoutMs: 45_000 }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      await audio.play();
    } catch {
      /* som é opcional */
    }
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setTurns((prev) => [...prev, { id: uid(), role: "user", text }]);
    setLoading(true);
    void persist("user", text);
    try {
      const history = [
        ...turns.map((t) => ({ role: t.role, content: t.text })),
        { role: "user" as const, content: text },
      ];
      const res = await fetchWithRetry(
        "/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, userName, learningLang, lessonContext }),
        },
        { timeoutMs: 60_000 }
      );
      if (!res.ok) throw new Error("O professor está indisponível agora.");
      const data = (await res.json()) as { content?: string };
      const { correction, rest } = splitCorrection(stripScore(data.content || ""));
      setTurns((prev) => [...prev, { id: uid(), role: "assistant", text: rest, correction }]);
      void persist("assistant", rest, correction);
      void speak(correction ? `${correction}. ${rest}` : rest);
    } catch (e: any) {
      setTurns((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: `⚠️ ${e.message || "Erro ao falar com o professor."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-primary-dark">Fale com o Delcio sobre esta aula</h2>
        {starter && turns.length === 0 && (
          <button
            onClick={() => send(starter)}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-dark hover:bg-primary/20"
          >
            Começar
          </button>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[420px] min-h-[180px] space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Escreva a sua resposta ou pergunta. O Delcio corrige com carinho e responde em voz.
          </p>
        )}
        {turns.map((t) => (
          <div key={t.id} className={t.role === "user" ? "text-right" : "text-left"}>
            {t.correction && (
              <div className="mb-1 inline-block rounded-xl bg-accent px-3 py-2 text-left text-sm">
                ✏️ {t.correction}
              </div>
            )}
            <div
              className={
                t.role === "user"
                  ? "inline-block max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-left text-primary-foreground"
                  : "inline-block max-w-[85%] rounded-2xl bg-secondary px-4 py-2 text-left"
              }
            >
              <p className="whitespace-pre-wrap text-sm">{t.text}</p>
              {t.role === "assistant" && (
                <button
                  onClick={() => speak(t.text)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary-dark hover:underline"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Ouvir
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Delcio está a escrever…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva aqui…"
          aria-label="Mensagem para o professor"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Enviar
        </button>
      </form>
    </div>
  );
}
