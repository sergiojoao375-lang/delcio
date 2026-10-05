import { Award, CheckCircle2, Feather, ShieldCheck } from "lucide-react";
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
    <article className="certificate relative min-h-[720px] w-full overflow-hidden bg-certificate-paper p-3 text-center text-certificate-ink shadow-certificate sm:aspect-[1.414/1] sm:min-h-0 sm:p-4">
      <div className="certificate-grain absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-3 border-[5px] border-double border-certificate-copper sm:inset-4 sm:border-[8px]" aria-hidden="true" />
      <div className="absolute inset-5 border border-certificate-green/70 sm:inset-7" aria-hidden="true" />
      <div className="absolute inset-7 border border-certificate-copper/40 sm:inset-10" aria-hidden="true" />

      {(["top-5 left-5 border-l-2 border-t-2", "top-5 right-5 border-r-2 border-t-2", "bottom-5 left-5 border-b-2 border-l-2", "bottom-5 right-5 border-b-2 border-r-2"] as const).map((classes) => (
        <div key={classes} className={`absolute h-12 w-12 border-certificate-green sm:h-20 sm:w-20 ${classes}`} aria-hidden="true" />
      ))}

      <div className="absolute inset-0 grid place-items-center text-certificate-green/[0.035]" aria-hidden="true">
        <ShieldCheck className="h-72 w-72 sm:h-96 sm:w-96" strokeWidth={0.7} />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center px-7 py-9 sm:px-16 sm:py-10">
        <header className="flex flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-certificate-copper bg-certificate-green text-certificate-paper shadow-sm sm:h-16 sm:w-16">
            <Feather className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={1.4} />
          </div>
          <p className="mt-2 font-certificate-body text-[9px] font-semibold uppercase text-certificate-green sm:text-xs">
            Delcio-English · Academia de Línguas
          </p>
          <h1 className="mt-1 font-certificate-heading text-3xl font-bold uppercase text-certificate-green sm:text-5xl">
            Certificado
          </h1>
          <div className="mt-1 flex items-center gap-3 sm:gap-4">
            <span className="h-px w-8 bg-certificate-copper sm:w-14" />
            <p className="font-certificate-body text-[8px] font-semibold uppercase text-certificate-copper sm:text-[11px]">
              de conclusão e excelência
            </p>
            <span className="h-px w-8 bg-certificate-copper sm:w-14" />
          </div>
          {details.sample && (
            <span className="mt-2 border border-certificate-copper/60 bg-certificate-copper/10 px-3 py-1 font-certificate-body text-[9px] font-semibold uppercase text-certificate-copper">
              Exemplar demonstrativo
            </span>
          )}
        </header>

        <section className="my-auto py-4 sm:py-5">
          <p className="font-certificate-heading text-xs italic text-certificate-muted sm:text-base">
            Certificamos, para os devidos fins, que
          </p>
          <div className="mx-auto mt-2 max-w-3xl border-b border-certificate-copper/70 px-3 pb-2 sm:px-12">
            <p className="font-certificate-heading text-2xl font-bold text-certificate-green sm:text-5xl">
              {details.fullName}
            </p>
          </div>
          <p className="mx-auto mt-3 max-w-2xl font-certificate-body text-[10px] leading-relaxed text-certificate-muted sm:text-sm">
            concluiu com mérito todos os módulos e requisitos do <strong className="font-semibold text-certificate-ink">{details.courseTitle}</strong>,
            demonstrando proficiência no nível <strong className="font-semibold text-certificate-ink">{level}</strong> e alcançando a classificação final de <strong className="font-semibold text-certificate-ink">{details.finalScore}/100</strong>.
          </p>
        </section>

        <footer className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-8">
          <div className="min-w-0 text-center font-certificate-body">
            <p className="font-certificate-heading text-sm italic text-certificate-green sm:text-lg">Delcio João</p>
            <div className="mx-auto mt-1 h-px max-w-40 bg-certificate-green/60" />
            <p className="mt-1 text-[7px] uppercase text-certificate-muted sm:text-[9px]">Direção académica</p>
          </div>

          <div className="relative flex flex-col items-center pb-1">
            <div className="absolute bottom-0 flex gap-1" aria-hidden="true">
              <span className="h-10 w-3 skew-x-12 bg-certificate-green/90" />
              <span className="h-10 w-3 -skew-x-12 bg-certificate-copper/90" />
            </div>
            <div className="relative grid h-16 w-16 place-items-center rounded-full border-[3px] border-double border-certificate-paper bg-certificate-copper text-certificate-paper shadow-md sm:h-20 sm:w-20">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-certificate-paper/70 sm:h-16 sm:w-16">
                <Award className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-end justify-center gap-2 text-left font-certificate-body sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[8px] font-semibold text-certificate-green sm:text-[10px]">
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Autenticidade verificável
              </div>
              <p className="mt-1 text-[7px] text-certificate-muted sm:text-[9px]">Emitido em {date}</p>
              <p className="mt-1 max-w-28 truncate font-mono text-[6px] text-certificate-muted sm:max-w-40 sm:text-[8px]">
                {details.verificationCode}
              </p>
            </div>
            <div className="shrink-0 border border-certificate-copper bg-certificate-qr p-1" aria-label="Código QR de verificação">
              <QRCodeSVG value={details.verificationUrl} size={58} level="M" />
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}