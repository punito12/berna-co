import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";
import { humanizeCmsKey } from "@/lib/cms-labels";
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

  return (
    <div>
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Ingredientes
      </h2>
      <p className="mb-4 text-sm text-muted">
        Editá los textos de las páginas que se abren desde “Nuestros
        ingredientes” en la página de inicio.
      </p>
      <div className="space-y-3">
        {ingredientTexts.map((text) => (
          <CmsTextField
            key={text.key}
            textKey={text.key}
            label={INGREDIENT_TEXT_LABELS[text.key] ?? humanizeCmsKey(text.key)}
            published={text.value}
            draft={text.valueDraft}
            style={text.style}
            styleDraft={text.styleDraft}
            maxLength={text.maxLength}
            multiline={text.maxLength > 100}
          />
        ))}
      </div>
    </div>
  );
}
