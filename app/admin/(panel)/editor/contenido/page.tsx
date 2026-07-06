import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";
import CmsImageField from "@/components/CmsImageField";
import { CONTENT_SECTIONS } from "@/lib/cms-content-schema";

// CMS de contenido v2: TODO lo editable del sitio público en una sola página,
// agrupado por sección visual. Sin controles de estilo (el diseño vive en el
// código); solo textos e imágenes, con el draft/publicar de siempre.
export default async function EditorContenidoPage() {
  const textKeys = CONTENT_SECTIONS.flatMap((s) =>
    s.fields.filter((f) => f.kind === "text").map((f) => f.key)
  );
  const imageKeys = CONTENT_SECTIONS.flatMap((s) =>
    s.fields.filter((f) => f.kind === "image").map((f) => f.key)
  );

  const [texts, images] = await Promise.all([
    prisma.siteText.findMany({
      where: { key: { in: textKeys } },
      select: {
        key: true,
        value: true,
        valueDraft: true,
        maxLength: true,
      },
    }),
    prisma.siteImage.findMany({
      where: { key: { in: imageKeys } },
      select: { key: true, url: true, urlDraft: true },
    }),
  ]);
  const textByKey = new Map(texts.map((t) => [t.key, t]));
  const imageByKey = new Map(images.map((i) => [i.key, i]));

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">
          Contenido del sitio
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          Todos los textos e imágenes del sitio público, ordenados como los ve
          el cliente. Los cambios se guardan como borrador y salen al aire
          recién cuando publicás.
        </p>
      </div>

      {CONTENT_SECTIONS.map((section) => (
        <section key={section.id} id={section.id}>
          <h3 className="font-black uppercase tracking-tight text-base text-ink">
            {section.title}
          </h3>
          <p className="mb-4 mt-0.5 text-sm text-muted">
            {section.description}
          </p>
          <div className="space-y-3">
            {section.fields.map((field) => {
              if (field.kind === "image") {
                const row = imageByKey.get(field.key);
                if (!row) return null;
                return (
                  <CmsImageField
                    key={field.key}
                    imageKey={field.key}
                    label={field.label}
                    published={row.url}
                    draft={row.urlDraft}
                  />
                );
              }
              const row = textByKey.get(field.key);
              if (!row) return null;
              return (
                <CmsTextField
                  key={field.key}
                  textKey={field.key}
                  label={field.label}
                  published={row.value}
                  draft={row.valueDraft}
                  maxLength={row.maxLength}
                  multiline={field.multiline}
                  allowStyle={false}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
