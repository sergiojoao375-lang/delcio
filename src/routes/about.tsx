import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, ArrowLeft, Zap, Sparkles, Mic, Trophy, WifiOff } from "lucide-react";
import logoAsset from "@/assets/sergiotech-logo.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre — Delcio-English" },
      {
        name: "description",
        content:
          "Delcio-English: assistente de conversação com IA para aprender inglês e português, com correções instantâneas, modo de voz e progresso por níveis.",
      },
      { property: "og:title", content: "Sobre — Delcio-English" },
      {
        property: "og:description",
        content:
          "Aprende inglês e português a conversar com o Delcio. Desenvolvido por Sérgio João (SérgioTech).",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://delcio-english.lovable.app/about" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://delcio-english.lovable.app/about" }],
  }),
  component: AboutPage,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Correções instantâneas",
    text: "O Delcio corrige a tua gramática e vocabulário a cada mensagem, com uma explicação curta na tua língua.",
  },
  {
    icon: Mic,
    title: "Modo de voz",
    text: "Fala e ouve respostas com vozes realistas — escolhe o professor com quem queres conversar.",
  },
  {
    icon: Trophy,
    title: "Níveis e progresso",
    text: "Ganha pontos, mantém a tua sequência e sobe de Iniciante até Avançado.",
  },
  {
    icon: WifiOff,
    title: "Funciona instalado",
    text: "Instala no telemóvel como aplicação e abre-a mesmo com ligação instável.",
  },
];


const WHATSAPP_URL = "https://wa.me/244931728474";
const EMAIL_URL = "mailto:sergiojoao931@gmail.com";

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header fixo */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={logoAsset.url}
              alt="SérgioTech"
              className="h-9 w-9 object-contain"
            />
            <span className="font-bold text-foreground tracking-tight">
              Sérgio<span className="text-primary">Tech</span>
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Conteúdo central */}
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-28">
        <section className="bubble-in flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Delcio-English
          </h1>
          <p className="mt-2 text-primary font-medium text-base sm:text-lg inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Aprende inglês e português a conversar
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <p className="text-card-foreground leading-relaxed text-center sm:text-left">
            O Delcio-English é um assistente de conversação com inteligência
            artificial que te ajuda a aprender inglês (ou português) a falar de
            verdade. Escreves ou falas, o Delcio responde na língua que estás a
            aprender, corrige os teus erros com uma explicação simples e mantém
            sempre a conversa a andar com uma nova pergunta.
          </p>
        </section>

        {/* Funcionalidades */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <div className="font-semibold text-foreground">{f.title}</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Autor */}
        <section className="mt-10 flex flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Logótipo SérgioTech"
            className="w-44 sm:w-52 object-contain drop-shadow-sm"
          />
          <h2 className="mt-3 text-xl font-bold tracking-tight">Sérgio João</h2>
          <p className="mt-1 text-primary font-medium text-sm inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            Especialista em Electricidade e Telecomunicações
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Desenvolvimento e manutenção da aplicação por SérgioTech.
          </p>
        </section>


        {/* Contactos */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                WhatsApp
              </div>
              <div className="font-semibold text-foreground truncate text-sm sm:text-base">
                +244 931 728 474
              </div>
            </div>
          </a>

          <a
            href={EMAIL_URL}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Mail className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </div>
              <div className="font-semibold text-foreground truncate text-sm sm:text-base">
                sergiojoao931@gmail.com
              </div>
            </div>
          </a>
        </section>

        {/* Botão Contactar */}
        <div className="mt-8 flex justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            Contactar
          </a>
        </div>
      </main>

      {/* Rodapé fixo */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-4xl px-4 py-3 text-center text-xs text-muted-foreground">
          © 2026 Delcio-English — por SérgioTech. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
