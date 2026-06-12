import { listSectionsAdmin } from "@/lib/cms-admin";
import { prisma } from "@/lib/db";
import HomeSectionsManager from "@/components/HomeSectionsManager";
import CmsImageField from "@/components/CmsImageField";
import { humanizeCmsKey } from "@/lib/cms-labels";

export default async function EditorHomePage() {
  const [sections, texts, images] = await Promise.all([
    listSectionsAdmin("home"),
    // Home + catalog texts (the products section reuses catalog texts).
    prisma.siteText.findMany({
      where: { category: { in: ["home", "catalogo"] } },
      select: {
        key: true,
        value: true,
        valueDraft: true,
        style: true,
        styleDraft: true,
        maxLength: true,
      },
    }),
    prisma.siteImage.findMany({
      where: { category: "home" },
      select: { key: true, url: true, urlDraft: true },
      orderBy: { key: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
          Página de inicio
        </h2>
        <p className="mb-4 text-sm leading-6 text-muted">
          Organizá las secciones que ve el cliente al entrar al sitio.
          Reordená, ocultá o editá contenido sin publicar hasta revisar la
          vista previa.
        </p>
      <HomeSectionsManager
        initialSections={sections.map((s) => ({
          key: s.key,
          type: s.type,
          visibleDraft: s.visibleDraft,
          orderDraft: s.orderDraft,
          configDraft: s.configDraft,
        }))}
        texts={texts}
      />
      </section>
      {images.length > 0 && (
        <section>
          <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
            Imágenes principales
          </h2>
          <p className="mb-4 text-sm leading-6 text-muted">
            Estas imágenes acompañan las secciones visibles de la página de
            inicio.
          </p>
          <div className="space-y-3">
            {images.map((image) => (
              <CmsImageField
                key={image.key}
                imageKey={image.key}
                label={
                  image.key === "home.hero.background"
                    ? "Inicio · imagen principal"
                    : humanizeCmsKey(image.key)
                }
                published={image.url}
                draft={image.urlDraft}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
