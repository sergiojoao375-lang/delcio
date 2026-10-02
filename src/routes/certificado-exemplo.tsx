import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { CourseCertificate } from "@/components/course-certificate";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificado-exemplo")({
  head: () => ({
    meta: [
      { title: "Exemplar do certificado — Delcio-English" },
      { name: "description", content: "Veja um exemplar do certificado final verificável do Delcio-English." },
      { property: "og:title", content: "Exemplar do certificado — Delcio-English" },
      { property: "og:description", content: "Certificado final com código QR de verificação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificateExamplePage,
});

function CertificateExamplePage() {
  const verificationUrl = "https://delcio.lovable.app/certificado-exemplo";
  return (
    <main className="min-h-screen bg-secondary px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Button asChild variant="ghost"><Link to="/"><ArrowLeft /> Voltar</Link></Button>
          <Button onClick={() => window.print()}><Printer /> Imprimir exemplar</Button>
        </div>
        <CourseCertificate details={{
          fullName: "Maria de Sousa",
          courseTitle: "Curso Completo de Inglês",
          level: "advanced",
          finalScore: 92,
          issuedAt: "2026-10-02T10:00:00.000Z",
          verificationCode: "EXEMPLO-DEMONSTRATIVO",
          verificationUrl,
          sample: true,
        }} />
        <p className="mt-4 text-center text-sm text-muted-foreground print:hidden">
          O certificado oficial será liberado depois da aprovação no exame final e terá um QR de validação único.
        </p>
      </div>
    </main>
  );
}