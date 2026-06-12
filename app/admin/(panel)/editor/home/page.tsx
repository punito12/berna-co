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
    <div>
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Secciones del Home
      </h2>
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
      {images.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
            Imágenes del Home
          </h2>
          <div className="space-y-3">
            {images.map((image) => (
              <CmsImageField
                key={image.key}
                imageKey={image.key}
                label={
                  image.key === "home.hero.background"
                    ? "Hero · imagen de fondo"
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
