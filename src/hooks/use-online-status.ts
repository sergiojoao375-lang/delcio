import { useEffect, useState } from "react";

/**
 * Estado de rede fiável.
 * Assume "online" por omissão (evita falsos "sem ligação" em SSR/preview e em
 * browsers onde navigator.onLine é incorreto) e só marca offline quando o
 * evento `offline` dispara E uma verificação real de rede falha.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // navigator.onLine === true nunca garante ligação, mas === false
      // também pode ser falso positivo. Confirmamos com um pedido curto.
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        await fetch("/manifest.json", {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    const on = () => setOnline(true);
    const off = () => {
      void verify();
    };

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    // Verificação inicial apenas se o browser diz estar offline.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      void verify();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
