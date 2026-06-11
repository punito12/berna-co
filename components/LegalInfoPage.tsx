import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import WhatsappFloat from "@/components/WhatsappFloat";
import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";
import Link from "next/link";

type LegalSection = {
  title: string;
  body: string;
};

export default function LegalInfoPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/10 bg-cream/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" aria-label="Volver al inicio">
            <BernaLogo variant="dark" size="sm" />
          </Link>
          <Link
            href="/"
            className="text-xs font-black uppercase tracking-[0.22em] text-ink/60 transition-colors hover:text-ink"
          >
            Inicio
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-tomato">
          {eyebrow}
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-black leading-none sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-ink/70 sm:text-lg">
          {intro}
        </p>

        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="font-black uppercase tracking-[0.08em] text-ink">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70 sm:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-ink p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-black uppercase tracking-[0.12em]">
              ¿Tenés una consulta?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Escribinos por WhatsApp antes de comprar si necesitás confirmar
              zonas, horarios, disponibilidad o algún detalle del pedido.
            </p>
          </div>
          <a
            href={`https://wa.me/${BUSINESS_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-tomato px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-tomato/90 sm:mt-0"
          >
            Consultar
          </a>
        </div>
      </section>

      <WhatsappFloat />
      <CmsFooter />
    </main>
  );
}
