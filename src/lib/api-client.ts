// Resilient fetch wrapper with retries + client-side error logging.
// Used for /api/chat and /api/tts so that a mid-flight LOVABLE_API_KEY
// rotation (or a transient upstream hiccup) doesn't surface as a hard
// error to the user.

const LOG_KEY = "delcio:error-log";
const LOG_MAX = 20;

export type FetchRetryOptions = {
  retries?: number; // total attempts = retries + 1
  timeoutMs?: number; // per-attempt timeout
  onRetry?: (info: { attempt: number; status?: number; reason: string }) => void;
};

export type ClientErrorEntry = {
  ts: string;
  requestId: string;
  url: string;
  attempts: number;
  status?: number;
  message: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function shouldRetry(status?: number, bodyError?: string) {
  if (status === undefined) return true; // network error
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if ((status === 401 || status === 403) && (bodyError === "unauthorized" || bodyError === "key_rotated"))
    return true;
  return false;
}

function backoff(attempt: number) {
  // attempt: 1 → ~400ms, 2 → ~900ms, 3 → ~2000ms (+jitter)
  const base = [400, 900, 2000, 4000][Math.min(attempt - 1, 3)];
  const jitter = Math.random() * 250;
  return base + jitter;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function logClientError(entry: ClientErrorEntry) {
  try {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LOG_KEY);
    const arr: ClientErrorEntry[] = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(0, LOG_MAX)));
  } catch {
    /* ignore quota / SSR */
  }
  // eslint-disable-next-line no-console
  console.error("[api-client]", entry);
}

export function readClientErrorLog(): ClientErrorEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ClientErrorEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearClientErrorLog() {
  try {
    window.localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchRetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 2; // 3 attempts total
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const requestId = uid();
  const headers = new Headers(init.headers);
  headers.set("X-Client-Request-Id", requestId);

  let lastStatus: number | undefined;
  let lastMessage = "unknown";

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return res;

      // Peek body for structured error, without consuming the caller's stream.
      lastStatus = res.status;
      let bodyError: string | undefined;
      let bodyMessage = "";
      const cloned = res.clone();
      try {
        const data = (await cloned.json()) as { error?: string; message?: string };
        bodyError = data?.error;
        bodyMessage = data?.message || data?.error || "";
      } catch {
        try {
          bodyMessage = (await res.clone().text()).slice(0, 200);
        } catch {
          /* ignore */
        }
      }
      lastMessage = bodyMessage || `HTTP ${res.status}`;

      if (attempt <= retries && shouldRetry(res.status, bodyError)) {
        opts.onRetry?.({ attempt, status: res.status, reason: bodyError || `http_${res.status}` });
        await sleep(backoff(attempt));
        continue;
      }
      // Terminal — return the response so caller can inspect it.
      logClientError({
        ts: new Date().toISOString(),
        requestId,
        url,
        attempts: attempt,
        status: res.status,
        message: lastMessage,
      });
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastMessage = err instanceof Error ? err.message : String(err);
      if (attempt <= retries && shouldRetry(undefined)) {
        opts.onRetry?.({ attempt, reason: lastMessage });
        await sleep(backoff(attempt));
        continue;
      }
      logClientError({
        ts: new Date().toISOString(),
        requestId,
        url,
        attempts: attempt,
        status: lastStatus,
        message: lastMessage,
      });
      throw err;
    }
  }
  // Should not reach here.
  throw new Error(lastMessage);
}
