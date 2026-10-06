import { useEffect, useRef, useState } from "react";
import { Volume2, Turtle } from "lucide-react";
import { speakText } from "@/lib/tts-client";

/** Extrai <suggestions>[...]</suggestions> da resposta do professor. */
export function extractSuggestions(content: string): { text: string; suggestions: Suggestion[] } {
  const m = content.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
  const text = content.replace(/<suggestions>[\s\S]*?<\/suggestions>/gi, "").trim();
  if (!m) return { text, suggestions: [] };
  try {
    const arr = JSON.parse(m[1] ?? "[]") as unknown;
    if (!Array.isArray(arr)) return { text, suggestions: [] };
    const suggestions = arr
      .map((s) => {
        if (typeof s === "string") {
          const [en, pt] = s.split("|");
          return { en: (en ?? "").trim(), pt: (pt ?? "").trim() };
        }
        if (s && typeof s === "object") {
          const o = s as Record<string, unknown>;
          return { en: String(o.en ?? "").trim(), pt: String(o.pt ?? "").trim() };
        }
        return { en: "", pt: "" };
      })
      .filter((s) => s.en)
      .slice(0, 3);
    return { text, suggestions };
  } catch {
    return { text, suggestions: [] };
  }
}

export type Suggestion = { en: string; pt: string };

export const STARTER_SUGGESTIONS: Suggestion[] = [
  { en: "I'm good, thank you!", pt: "Estou bem, obrigado!" },
  { en: "Can you speak slower, please?", pt: "Podes falar mais devagar?" },
  { en: "I don't understand.", pt: "Não entendo." },
];

export function SuggestionChips({
  suggestions,
  onPick,
  disabled,
}: {
  suggestions: Suggestion[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Respostas rápidas">
      {suggestions.map((s) => (
        <button
          key={s.en}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.en)}
          className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-left text-sm text-foreground transition hover:bg-primary/20 disabled:opacity-50"
        >
          <span className="block font-medium leading-tight">{s.en}</span>
          {s.pt && <span className="block text-[11px] leading-tight text-muted-foreground">{s.pt}</span>}
        </button>
      ))}
    </div>
  );
}

const wordCache = new Map<string, string>();

async function translateWord(word: string, sentence: string): Promise<string> {
  const key = word.toLowerCase();
  const hit = wordCache.get(key);
  if (hit) return hit;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "word", word, sentence: sentence.slice(0, 400) }),
  });
  if (!res.ok) throw new Error("fail");
  const data = (await res.json()) as { content?: string };
  const out = (data.content || "").trim() || "—";
  wordCache.set(key, out);
  return out;
}

/** Texto em que cada palavra pode ser tocada para ver a tradução. */
export function TapText({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState<{ idx: number; word: string; tr: string | null } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const parts = text.split(/(\s+)/);
  return (
    <span ref={ref} className={className}>
      {parts.map((p, i) => {
        const word = p.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "");
        if (!word || /\s/.test(p)) return <span key={i}>{p}</span>;
        const active = open?.idx === i;
        return (
          <span key={i} className="relative inline">
            <span
              role="button"
              tabIndex={0}
              onClick={() => {
                setOpen({ idx: i, word, tr: null });
                translateWord(word, text)
                  .then((tr) => setOpen((o) => (o?.idx === i ? { ...o, tr } : o)))
                  .catch(() => setOpen((o) => (o?.idx === i ? { ...o, tr: "Sem tradução agora" } : o)));
              }}
              className={`cursor-pointer rounded decoration-dotted underline-offset-4 hover:underline ${active ? "bg-primary/25" : ""}`}
            >
              {p}
            </span>
            {active && (
              <span className="absolute bottom-full left-0 z-30 mb-1 flex w-max max-w-[220px] items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                <span>
                  <b>{word}</b> → {open.tr ?? "…"}
                </span>
                <button
                  type="button"
                  aria-label={`Ouvir ${word}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void speakText(word, 0.8);
                  }}
                  className="rounded-full bg-primary/15 p-1"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Botões Ouvir (1x) e Lento (0.75x). */
export function ListenButtons({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 text-xs ${className}`}>
      <button type="button" onClick={() => void speakText(text, 1)} className="inline-flex items-center gap-1 hover:underline">
        <Volume2 className="h-3.5 w-3.5" /> Ouvir
      </button>
      <button type="button" onClick={() => void speakText(text, 0.75)} className="inline-flex items-center gap-1 hover:underline" aria-label="Ouvir devagar">
        <Turtle className="h-3.5 w-3.5" /> Devagar
      </button>
    </span>
  );
}
