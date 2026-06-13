import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";
import {
  TRUST_SECTIONS,
  TRUST_CMS_TEXTS,
  FAQ_KEY,
  ensureTrustCmsTexts,
} from "@/lib/cms-trust";

const SECTION_NAMES: Record<string, string> = {
  "como-comprar": "Cómo comprar",
  envios: "Envíos y zonas",
  conservacion: "Conservación de congelados",
  "medios-de-pago": "Medios de pago",
};

export default async function EditorConfianzaPage() {
  // Create any missing trust texts so they're editable. Never overwrites edits.
  await ensureTrustCmsTexts();

  const rows = await prisma.siteText.findMany({
    where: { key: { in: TRUST_CMS_TEXTS.map((t) => t.key) } },
    select: {
      key: true,
      value: true,
      valueDraft: true,
      style: true,
      styleDraft: true,
      maxLength: true,
    },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const faq = byKey.get(FAQ_KEY);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Confianza y contenido
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Cómo comprar, envíos, conservación y pagos
            </h2>
          </div>
          <a
            href="/confianza"
            target="_blank"
            className="w-fit rounded-full border border-line bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-ink transition-colors hover:border-ink"
          >
            Ver página pública
          </a>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-cream/35 p-4 text-sm leading-6 text-muted">
          Estos textos aparecen en la página{" "}
          <span className="font-bold text-ink">/confianza</span> (linkeada como
          “Cómo comprar” en el pie del sitio). En el campo “Contenido”, cada
          bloque empieza con su título en la primera línea y el texto debajo;
          dejá una línea en blanco para separar un bloque del siguiente.
        </div>
      </section>

      {TRUST_SECTIONS.map((def) => {
        const title = byKey.get(def.titleKey);
        const intro = byKey.get(def.introKey);
        const body = byKey.get(def.bodyKey);
        return (
          <section
            key={def.slug}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm"
          >
            <h3 className="mb-4 border-b border-line pb-3 font-black uppercase tracking-tight text-lg text-ink">
              {SECTION_NAMES[def.slug] ?? def.fallbackTitle}
            </h3>
            <div className="grid gap-3">
              {title && (
                <CmsTextField
                  textKey={def.titleKey}
                  label="Título"
                  published={title.value}
                  draft={title.valueDraft}
                  style={title.style}
                  styleDraft={title.styleDraft}
                  maxLength={title.maxLength}
                  allowStyle={false}
                />
              )}
              {intro && (
                <CmsTextField
                  textKey={def.introKey}
                  label="Introducción"
                  published={intro.value}
                  draft={intro.valueDraft}
                  style={intro.style}
                  styleDraft={intro.styleDraft}
                  maxLength={intro.maxLength}
                  multiline
                  allowStyle={false}
                />
              )}
              {body && (
                <CmsTextField
                  textKey={def.bodyKey}
                  label="Contenido"
                  published={body.value}
                  draft={body.valueDraft}
                  style={body.style}
                  styleDraft={body.styleDraft}
                  maxLength={body.maxLength}
                  multiline
                  allowStyle={false}
                />
              )}
            </div>
          </section>
        );
      })}

      {/* FAQ */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-black uppercase tracking-tight text-lg text-ink">
          Preguntas frecuentes
        </h3>
        <p className="mb-4 text-sm leading-6 text-muted">
          Cada pregunta va en una línea que empieza con{" "}
          <code className="rounded bg-cream px-1">Q:</code> y su respuesta en la
          línea siguiente con <code className="rounded bg-cream px-1">A:</code>.
          Dejá una línea en blanco entre una pregunta y la siguiente.
        </p>
        {faq && (
          <CmsTextField
            textKey={FAQ_KEY}
            label="Preguntas y respuestas"
            published={faq.value}
            draft={faq.valueDraft}
            style={faq.style}
            styleDraft={faq.styleDraft}
            maxLength={faq.maxLength}
            multiline
            allowStyle={false}
          />
        )}
      </section>
    </div>
  );
}
