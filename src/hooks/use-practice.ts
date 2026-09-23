import { useEffect, useRef } from "react";
import { recordActivity } from "@/lib/learning.functions";

/**
 * Conta o tempo de prática do aluno enquanto a página está aberta e visível,
 * enviando 1 minuto por vez para o servidor (alimenta meta diária, ofensiva e pontos).
 */
export function usePractice(active: boolean) {
  const pending = useRef(0);

  useEffect(() => {
    if (!active) return;
    let stopped = false;

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pending.current += 1;
      if (pending.current >= 1) {
        const minutes = pending.current;
        pending.current = 0;
        void recordActivity({ data: { minutes, xp: minutes * 4 } }).catch(() => {});
      }
    }, 60_000);

    return () => {
      stopped = true;
      window.clearInterval(tick);
      void stopped;
    };
  }, [active]);
}
