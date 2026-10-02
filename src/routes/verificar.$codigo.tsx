import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyCertificate } from "@/lib/certificate.functions";
import { LEVEL_LABEL, type Level } from "@/lib/levels";

export const Route = createFileRoute("/verificar/$codigo")({
  loader: ({ params }) => verifyCertificate({ data: { code: params.codigo } }),
  head: () => ({
    meta: [
      { title: "Verificar certificado — Delcio-English" },
      { name: "description", content: "Valide a autenticidade de um certificado Delcio-English." },
      { property: "og:title", content: "Verificar certificado — Delcio-English" },
      { property: "og:description", content: "Validação pública de certificados Delcio-English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
  errorComponent: () => <main className="p-8 text-center">Não foi possível verificar este certificado.</main>,
  notFoundComponent: () => <main className="p-8 text-center">Certificado não encontrado.</main>,
});

function VerifyPage() {
  const certificate = Route.useLoaderData();
  return (
    <main className="grid min-h-screen place-items-center bg-secondary px-4 py-10">
      <section className="w-full max-w-lg border border-border bg-card p-6 text-center shadow-lg sm:p-8">
        {certificate ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <h1 className="mt-4 text-2xl font-bold text-primary-dark">Certificado autêntico</h1>
            <dl className="mt-6 grid gap-4 text-left">
              <div><dt className="text-xs text-muted-foreground">Aluno</dt><dd className="font-semibold">{certificate.fullName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Curso</dt><dd>{certificate.courseTitle}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Resultado</dt><dd>{LEVEL_LABEL[certificate.level as Level] ?? certificate.level} · {certificate.finalScore}/100</dd></div>
              <div><dt className="text-xs text-muted-foreground">Emissão</dt><dd>{new Intl.DateTimeFormat("pt-PT").format(new Date(certificate.issuedAt))}</dd></div>
            </dl>
          </>
        ) : (
          <><XCircle className="mx-auto h-14 w-14 text-destructive" /><h1 className="mt-4 text-2xl font-bold">Certificado inválido</h1><p className="mt-2 text-muted-foreground">Este código não corresponde a um certificado emitido pelo Delcio-English.</p></>
        )}
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Ir para Delcio-English</Link>
      </section>
    </main>
  );
}