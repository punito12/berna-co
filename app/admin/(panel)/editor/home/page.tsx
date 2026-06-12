import { listSectionsAdmin } from "@/lib/cms-admin";
import { prisma } from "@/lib/db";
import HomeSectionsManager from "@/components/HomeSectionsManager";
import CmsImageField from "@/components/CmsImageField";
import CmsTextField from "@/components/CmsTextField";
import { INGREDIENT_CMS_TEXTS } from "@/lib/ingredients";

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

export default async function EditorHomePage() {
  await ensureIngredientCmsTexts();

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
  const ingredientTextKeys = new Set(INGREDIENT_CMS_TEXTS.map((text) => text.key));
  const ingredientTexts = texts
    .filter((text) => ingredientTextKeys.has(text.key))
    .sort(
      (a, b) =>
        INGREDIENT_CMS_TEXTS.findIndex((text) => text.key === a.key) -
        INGREDIENT_CMS_TEXTS.findIndex((text) => text.key === b.key)
    );

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
      <section className="mt-8">
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Páginas de ingredientes
        </h2>
        <p className="mb-4 text-sm text-muted">
          Estos textos aparecen en las páginas que se abren desde “Nuestros
          ingredientes”.
        </p>
        <div className="space-y-3">
          {ingredientTexts.map((text) => (
            <CmsTextField
              key={text.key}
              textKey={text.key}
              label={INGREDIENT_TEXT_LABELS[text.key] ?? text.key}
              published={text.value}
              draft={text.valueDraft}
              style={text.style}
              styleDraft={text.styleDraft}
              maxLength={text.maxLength}
              multiline={text.maxLength > 100}
            />
          ))}
        </div>
      </section>
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
                    : image.key
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
