import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";
import { LEGAL_PAGES, LEGAL_CMS_TEXTS, ensureLegalCmsTexts } from "@/lib/cms-legal";

// Friendly page names shown to the owner (no technical keys).
const PAGE_NAMES: Record<string, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  envios: "Envíos",
  cambios: "Cambios y devoluciones",
};

export default async function EditorLegalesPage() {
  // Create any missing legal texts so they're editable. Never overwrites edits.
  await ensureLegalCmsTexts();

  const rows = await prisma.siteText.findMany({
    where: { key: { in: LEGAL_CMS_TEXTS.map((t) => t.key) } },
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Confianza y legales
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Páginas legales
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Editá el contenido de las páginas de información del sitio. Cada
            página mantiene su ruta pública y se publica junto con el resto del
            CMS.
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-cream/35 p-4 text-sm leading-6 text-muted">
          En el campo “Contenido”, cada sección empieza con su título en la
          primera línea y el texto debajo. Dejá una línea en blanco para separar
          una sección de la siguiente.
        </div>
      </section>

      <div className="space-y-5">
        {LEGAL_PAGES.map((page) => {
          const title = byKey.get(page.titleKey);
          const intro = byKey.get(page.introKey);
          const body = byKey.get(page.bodyKey);
          return (
            <section
              key={page.slug}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black uppercase tracking-tight text-lg text-ink">
                    {PAGE_NAMES[page.slug] ?? page.fallbackTitle}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Página pública:{" "}
                    <span className="font-bold text-ink">{page.route}</span>
                  </p>
                </div>
                <span className="w-fit rounded-full border border-line bg-cream px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                  3 campos
                </span>
              </div>
              <div className="grid gap-3">
                {title && (
                  <CmsTextField
                    textKey={page.titleKey}
                    label="Título"
                    published={title.value}
                    draft={title.valueDraft}
                    style={title.style}
                    styleDraft={title.styleDraft}
                    maxLength={title.maxLength}
                  />
                )}
                {intro && (
                  <CmsTextField
                    textKey={page.introKey}
                    label="Introducción"
                    published={intro.value}
                    draft={intro.valueDraft}
                    style={intro.style}
                    styleDraft={intro.styleDraft}
                    maxLength={intro.maxLength}
                    multiline
                  />
                )}
                {body && (
                  <CmsTextField
                    textKey={page.bodyKey}
                    label="Contenido"
                    published={body.value}
                    draft={body.valueDraft}
                    style={body.style}
                    styleDraft={body.styleDraft}
                    maxLength={body.maxLength}
                    multiline
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
