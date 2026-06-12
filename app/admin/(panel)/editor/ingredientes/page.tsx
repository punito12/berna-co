import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";
import { humanizeCmsKey } from "@/lib/cms-labels";
import { INGREDIENT_CMS_TEXTS, INGREDIENT_PAGES } from "@/lib/ingredients";

const INGREDIENT_TEXT_LABELS: Record<string, string> = {
  "ingredient.huevos.title": "Huevos · título",
  "ingredient.huevos.intro": "Huevos · intro",
  "ingredient.huevos.body": "Huevos · texto",
  "ingredient.pollo.title": "Pollo Pastoril · título",
  "ingredient.pollo.intro": "Pollo Pastoril · intro",
  "ingredient.pollo.body": "Pollo Pastoril · texto",
  "ingredient.peceto.title": "Peceto de Pastura · título",
  "ingredient.peceto.intro": "Peceto de Pastura · intro",
  "ingredient.peceto.body": "Peceto de Pastura · texto",
};

// Idempotently create the ingredient CMS texts if they don't exist yet, so the
// owner can edit them. Never overwrites existing (edited/published) values.
async function ensureIngredientCmsTexts() {
  await prisma.$transaction(
    INGREDIENT_CMS_TEXTS.map((text) =>
      prisma.siteText.upsert({
        where: { key: text.key },
        update: { maxLength: text.maxLength, category: text.category },
        create: {
          key: text.key,
          value: text.value,
          valueDraft: text.value,
          maxLength: text.maxLength,
          category: text.category,
        },
      })
    )
  );
}

export default async function EditorIngredientesPage() {
  await ensureIngredientCmsTexts();

  const rows = await prisma.siteText.findMany({
    where: { key: { in: INGREDIENT_CMS_TEXTS.map((t) => t.key) } },
    select: {
      key: true,
      value: true,
      valueDraft: true,
      style: true,
      styleDraft: true,
      maxLength: true,
    },
  });

  // Keep the same order as INGREDIENT_CMS_TEXTS (huevos → pollo → peceto).
  const ingredientTexts = rows.sort(
    (a, b) =>
      INGREDIENT_CMS_TEXTS.findIndex((text) => text.key === a.key) -
      INGREDIENT_CMS_TEXTS.findIndex((text) => text.key === b.key)
  );
  const byKey = new Map(ingredientTexts.map((text) => [text.key, text]));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Home / Nuestros ingredientes
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Páginas de ingredientes
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Editá el contenido de las páginas que se abren al tocar cada card de
            “Nuestros ingredientes”. La home conserva solo el resumen clickeable.
          </p>
        </div>
      </section>

      <div className="space-y-5">
        {INGREDIENT_PAGES.map((page) => {
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
                    {page.fallbackTitle}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Página pública:{" "}
                    <span className="font-bold text-ink">{page.href}</span>
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
                    label={
                      INGREDIENT_TEXT_LABELS[page.titleKey] ??
                      humanizeCmsKey(page.titleKey)
                    }
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
                    label={
                      INGREDIENT_TEXT_LABELS[page.introKey] ??
                      humanizeCmsKey(page.introKey)
                    }
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
                    label={
                      INGREDIENT_TEXT_LABELS[page.bodyKey] ??
                      humanizeCmsKey(page.bodyKey)
                    }
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
