import { prisma } from "@/lib/db";
import SeoEditor from "@/components/SeoEditor";
import {
  SEO_GLOBAL,
  SEO_PAGES,
  SEO_OG_IMAGE_KEY,
  SEO_CMS_TEXTS,
  ensureSeoCmsRows,
} from "@/lib/cms-seo";

export default async function EditorSeoPage() {
  // Create any missing SEO rows so they're editable. Never overwrites edits.
  await ensureSeoCmsRows();

  const [texts, image] = await Promise.all([
    prisma.siteText.findMany({
      where: { key: { in: SEO_CMS_TEXTS.map((t) => t.key) } },
      select: { key: true, valueDraft: true },
    }),
    prisma.siteImage.findUnique({
      where: { key: SEO_OG_IMAGE_KEY },
      select: { key: true, url: true, urlDraft: true },
    }),
  ]);
  const draft = (key: string) =>
    texts.find((t) => t.key === key)?.valueDraft ?? "";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
          SEO y compartir
        </p>
        <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
          Cómo aparece la web en Google y al compartirla
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Editá el título, la descripción y la imagen que se ven en Google y al
          compartir el link. Los cambios quedan en borrador hasta que publiques.
        </p>
      </section>

      <SeoEditor
        keys={{
          title: SEO_GLOBAL.title,
          description: SEO_GLOBAL.description,
          ogTitle: SEO_GLOBAL.ogTitle,
          ogDescription: SEO_GLOBAL.ogDescription,
          homeTitle: SEO_PAGES.home.title,
          homeDescription: SEO_PAGES.home.description,
          confianzaTitle: SEO_PAGES.confianza.title,
          confianzaDescription: SEO_PAGES.confianza.description,
        }}
        initial={{
          title: draft(SEO_GLOBAL.title),
          description: draft(SEO_GLOBAL.description),
          ogTitle: draft(SEO_GLOBAL.ogTitle),
          ogDescription: draft(SEO_GLOBAL.ogDescription),
          homeTitle: draft(SEO_PAGES.home.title),
          homeDescription: draft(SEO_PAGES.home.description),
          confianzaTitle: draft(SEO_PAGES.confianza.title),
          confianzaDescription: draft(SEO_PAGES.confianza.description),
        }}
        ogImage={{
          key: SEO_OG_IMAGE_KEY,
          published: image?.url ?? "",
          draft: image?.urlDraft ?? "",
        }}
      />
    </div>
  );
}
