import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Body = {
  messages?: ChatMessage[];
  userName?: string;
  learningLang?: "en" | "pt";
  mode?: "chat" | "translate" | "word";
  word?: string;
  sentence?: string;
  textToTranslate?: string;
  voiceMode?: boolean;
  lessonContext?: string;
  level?: string;
};

function buildSystemPrompt(userName: string, learningLang: "en" | "pt", voiceMode = false) {
  const target = learningLang === "en" ? "English" : "Português";
  const native = learningLang === "en" ? "Português" : "English";
  const voiceRule = voiceMode
    ? `\nVOICE MODE: the student is SPEAKING and their words come from automatic speech recognition. NEVER correct punctuation, capitalization, accents, or spelling — those are artifacts of the transcription, not the student's mistakes. Correct ONLY real spoken errors: grammar, word choice, or verb forms. If the only difference is punctuation/capitalization/spelling, treat the message as CORRECT and omit the ✏️ line.\n`
    : "";
  return `You are "Delcio", a friendly, patient beginner language teacher.
The student's name is ${userName}. They are learning ${target} and their native language is ${native}.
${voiceRule}
STRICT RULES (follow EVERY message):
1. If the student's message has any grammar, spelling, or vocabulary mistake in ${target}, START your reply with a gentle correction line in this EXACT format (this is the ONLY line allowed to contain ${native}):
   ✏️ <corrected version in ${target}> — <very short explanation in ${native}>
   If there is NO mistake, do NOT include the ✏️ line at all.
2. Write the rest of your reply ENTIRELY in ${target}. Keep it short: 2–4 lines. Do NOT translate to ${native}. Do NOT repeat the same content in another language. Do NOT add flags or language prefixes.
3. ALWAYS end with a single follow-up question in ${target} (only) to keep the conversation going.
4. Use simple beginner vocabulary. Occasionally address the student by name (${userName}).
5. At the very END of your message, append a hidden score tag on its own line, EXACTLY like:
   <score>{"correct": true}</score>
   Use "correct": false ONLY when you actually had to correct the student.
Never break these rules. Never wrap the whole response in code blocks. The student can request a translation to ${native} via a separate "Translate" button — never preempt it.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let messages: ChatMessage[] = [];

        if (body.mode === "word" && body.word) {
          messages = [
            {
              role: "system",
              content:
                "Translate the given English word to European/Brazilian Portuguese as used in the sentence. Reply with ONLY 1-4 words, no quotes, no explanation.",
            },
            { role: "user", content: `Word: ${String(body.word).slice(0, 40)}\nSentence: ${String(body.sentence ?? "").slice(0, 400)}` },
          ];
        } else if (body.mode === "translate" && body.textToTranslate) {
          const target = body.learningLang === "en" ? "Português (Brazilian)" : "English";
          messages = [
            {
              role: "system",
              content: `You are a translator. Translate the user's message to ${target}. Reply ONLY with the translation, no quotes, no extra commentary.`,
            },
            { role: "user", content: body.textToTranslate },
          ];
        } else {
          const userName = body.userName || "amigo";
          const learningLang = (body.learningLang || "en") as "en" | "pt";
          const isBeginner = !body.level || body.level === "beginner";
          const native = learningLang === "en" ? "Portuguese" : "English";
          const target = learningLang === "en" ? "English" : "Portuguese";
          messages = [
            {
              role: "system",
              content:
                buildSystemPrompt(userName, learningLang, body.voiceMode === true) +
                (body.level
                  ? `\n\nSTUDENT LEVEL: ${String(body.level).slice(0, 20)} (beginner=A1, elementary=A2, intermediate=B1, advanced=B2). Adapt vocabulary, sentence length and complexity to this level.`
                  : "") +
                (isBeginner
                  ? `\n\nBILINGUAL BEGINNER MODE (overrides rule 2): the student knows almost no ${target}. Use very short ${target} sentences (max 8 words each). After your ${target} text, add ONE line starting with "🇧🇷 " giving the ${native} translation plus a tiny encouraging tip on how to answer. Always praise effort warmly.`
                  : "") +
                `\n\nQUICK REPLIES: after the score tag, append EXACTLY one line: <suggestions>["<short ${target} reply>|<${native} translation>", "...", "..."]</suggestions> with 3 simple, natural answers the student could give to your question${isBeginner ? " (very easy, 2-6 words)" : ""}.` +
                (body.lessonContext
                  ? `\n\nCURRENT LESSON CONTEXT (use it to guide the student, ask about it, and check their answers to its exercises):\n${body.lessonContext.slice(0, 4000)}`
                  : ""),
            },
            ...(body.messages || []),
          ];
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
          }),
        });

        const reqId = request.headers.get("X-Client-Request-Id") || "";
        const respHeaders = { "Content-Type": "application/json", "X-Backend-Request-Id": reqId };
        if (!res.ok) {
          const text = await res.text();
          console.error(
            JSON.stringify({ scope: "chat", requestId: reqId, upstreamStatus: res.status, message: text.slice(0, 300) })
          );
          if (res.status === 429)
            return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers: respHeaders });
          if (res.status === 402)
            return new Response(JSON.stringify({ error: "credits" }), { status: 402, headers: respHeaders });
          if (res.status === 401 || res.status === 403)
            return new Response(
              JSON.stringify({ error: "key_rotated", retryable: true, message: "Auth to AI gateway failed — key may be rotating." }),
              { status: 503, headers: respHeaders }
            );
          return new Response(JSON.stringify({ error: text }), { status: 500, headers: respHeaders });
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content ?? "";
        return new Response(JSON.stringify({ content }), { headers: respHeaders });
      },
    },
  },
});
