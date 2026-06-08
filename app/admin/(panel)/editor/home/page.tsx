import { listSectionsAdmin } from "@/lib/cms-admin";
import { prisma } from "@/lib/db";
import HomeSectionsManager from "@/components/HomeSectionsManager";

export default async function EditorHomePage() {
  const [sections, texts] = await Promise.all([
    listSectionsAdmin("home"),
    // Home + catalog texts (the products section reuses catalog texts).
    prisma.siteText.findMany({
      where: { category: { in: ["home", "catalogo"] } },
      select: { key: true, value: true, valueDraft: true, maxLength: true },
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
        }))}
        texts={texts}
      />
    </div>
  );
}
