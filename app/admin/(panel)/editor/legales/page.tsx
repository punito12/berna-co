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
    <div>
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Páginas legales
      </h2>
      <p className="mb-6 text-sm text-muted">
        Editá el contenido de las páginas de información del sitio. En el campo
        “Contenido”, cada bloque empieza con su título en la primera línea y el
        texto debajo; dejá una línea en blanco para separar un bloque del
        siguiente.
      </p>

      <div className="space-y-8">
        {LEGAL_PAGES.map((page) => {
          const title = byKey.get(page.titleKey);
          const intro = byKey.get(page.introKey);
          const body = byKey.get(page.bodyKey);
          return (
            <section
              key={page.slug}
              className="rounded-lg border border-line bg-white p-4"
            >
              <h3 className="mb-1 font-black uppercase tracking-tight text-lg text-ink">
                {PAGE_NAMES[page.slug] ?? page.fallbackTitle}
              </h3>
              <p className="mb-4 text-xs text-muted">
                Página pública: {page.route}
              </p>
              <div className="space-y-3">
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
