import type { Metadata } from "next";
import Link from "next/link";
import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import WhatsappFloat from "@/components/WhatsappFloat";
import RichText from "@/components/RichText";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { loadCmsBundle, isPreview } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import {
  TRUST_SECTIONS,
  resolveTrustSection,
  resolveFaq,
} from "@/lib/cms-trust";
import { getPageSeo } from "@/lib/cms-seo";

const FALLBACK_TITLE = "Cómo comprar";
const FALLBACK_DESCRIPTION =
  "Cómo comprar en Berna&co: pasos del pedido, envíos y zonas, conservación de congelados, medios de pago y preguntas frecuentes.";

// Metadata from the CMS (seo.confianza.*), falling back to the values above.
export async function generateMetadata(): Promise<Metadata> {
  let title = FALLBACK_TITLE;
  let description = FALLBACK_DESCRIPTION;
  try {
    const bundle = await loadCmsBundle();
    const page = getPageSeo(
      bundle,
      "confianza",
      FALLBACK_TITLE,
      FALLBACK_DESCRIPTION
    );
    title = page.title;
    description = page.description;
  } catch {
    // keep fallbacks
  }
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/confianza") },
  };
}

export default async function ConfianzaPage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const cms = await loadCmsBundle();
  const preview =
    (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);

  const sections = TRUST_SECTIONS.map((def) => ({
    slug: def.slug,
    ...resolveTrustSection(def, cms, preview),
  }));
  const faq = resolveFaq(cms, preview);

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
        <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="max-w-3xl font-black uppercase tracking-tight text-4xl leading-none sm:text-6xl">
          Cómo comprar y todo lo que necesitás saber
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-ink/70 sm:text-lg">
          Te contamos cómo hacer tu pedido, cómo entregamos, cómo conservar los
          productos y cómo podés pagar. Si te queda alguna duda, escribinos por
          WhatsApp.
        </p>

        {sections.map((section) => (
          <div key={section.slug} id={section.slug} className="mt-12 scroll-mt-24">
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink sm:text-3xl">
              {section.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">
              {section.intro}
            </p>
            <div className="mt-6 grid gap-4">
              {section.blocks.map((block, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
                >
                  {block.heading && (
                    <h3 className="font-black uppercase tracking-[0.08em] text-ink">
                      {block.heading}
                    </h3>
                  )}
                  {block.body && (
                    <RichText
                      text={block.body}
                      className="mt-3 text-sm leading-7 text-ink/70 sm:text-base [&_p]:mt-2 first:[&_p]:mt-0"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* FAQ */}
        <div id="faq" className="mt-12 scroll-mt-24">
          <h2 className="font-black uppercase tracking-tight text-2xl text-ink sm:text-3xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-6 space-y-3">
            {faq.map((item, i) => (
              <details
                key={i}
                className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
              >
                <summary className="cursor-pointer font-black uppercase tracking-[0.04em] text-ink">
                  {item.question}
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/70 sm:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <WhatsappFloat />
      <CmsFooter preview={preview} />
    </main>
  );
}
