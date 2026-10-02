import { Award, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LEVEL_LABEL, type Level } from "@/lib/levels";

export type CertificateDetails = {
  fullName: string;
  courseTitle: string;
  level: string;
  finalScore: number;
  issuedAt: string;
  verificationCode: string;
  verificationUrl: string;
  sample?: boolean;
};

export function CourseCertificate({ details }: { details: CertificateDetails }) {
  const level = LEVEL_LABEL[details.level as Level] ?? details.level;
  const date = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(details.issuedAt));

  return (
    <article className="certificate relative aspect-[1.414/1] w-full overflow-hidden border-[10px] border-primary bg-card p-5 text-center text-card-foreground shadow-xl sm:p-10">
      <div className="absolute inset-2 border border-primary/40" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-between">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground sm:h-20 sm:w-20">
            <Award className="h-8 w-8 sm:h-11 sm:w-11" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase text-primary sm:text-sm">Delcio-English</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-dark sm:text-5xl">Certificado de Conclusão</h1>
          {details.sample && (
            <span className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              EXEMPLAR
            </span>
          )}
        </div>

        <div className="my-3">
          <p className="text-xs text-muted-foreground sm:text-base">Certificamos que</p>
          <p className="mt-1 border-b border-primary/40 px-6 pb-1 text-xl font-bold sm:px-16 sm:text-4xl">
            {details.fullName}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-base">
            concluiu com aproveitamento o <strong className="text-foreground">{details.courseTitle}</strong>,
            alcançando o nível <strong className="text-foreground">{level}</strong> com nota final de {details.finalScore}/100.
          </p>
        </div>

        <div className="grid w-full grid-cols-[1fr_auto] items-end gap-4 text-left">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary sm:text-sm">
              <CheckCircle2 className="h-4 w-4" /> Certificado verificável
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">Emitido em {date}</p>
            <p className="mt-1 truncate font-mono text-[8px] text-muted-foreground sm:text-[10px]">
              Código: {details.verificationCode}
            </p>
          </div>
          <div className="shrink-0 border border-border bg-background p-1.5" aria-label="Código QR de verificação">
            <QRCodeSVG value={details.verificationUrl} size={76} level="M" />
          </div>
        </div>
      </div>
    </article>
  );
}