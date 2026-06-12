import { listTextsByCategory } from "@/lib/cms-admin";
import { humanizeCmsKey } from "@/lib/cms-labels";
import { CATALOG_CMS_LABELS } from "@/lib/catalog-cms-labels";
import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";

// Human labels for the catalog text keys.
const LABELS: Record<string, string> = {
  "catalogo.eyebrow": "Bajada (arriba del título)",
  "catalogo.title": "Título",
  "catalogo.subtitle": "Subtítulo",
  "catalogo.filter.all": "Filtro · Todos",
  "catalogo.outOfStock": "Mensaje sin stock",
  "catalogo.empty": "Mensaje catálogo vacío",
  ...Object.fromEntries(CATALOG_CMS_LABELS.map((label) => [label.key, label.label])),
};

function isStyleLockedLabel(key: string) {
  return (
    key.startsWith("catalog.product.") ||
    key.startsWith("catalog.cart.") ||
    key.startsWith("catalog.badge.") ||
    key.startsWith("catalog.filter.") ||
    key === "catalogo.filter.all" ||
    key === "catalogo.outOfStock"
  );
}

export default async function EditorCatalogoPage() {
  await ensureCatalogCmsLabels();
  const texts = await listTextsByCategory("catalogo");
  return (
    <div>
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Textos del catálogo
      </h2>
      <div className="space-y-3">
        {texts.map((t) => (
          <CmsTextField
            key={t.key}
            textKey={t.key}
            label={LABELS[t.key] ?? humanizeCmsKey(t.key)}
            published={t.value}
            draft={t.valueDraft}
            style={t.style}
            styleDraft={t.styleDraft}
            maxLength={t.maxLength}
            multiline={t.maxLength > 80}
            allowStyle={!isStyleLockedLabel(t.key)}
          />
        ))}
      </div>
    </div>
  );
}

async function ensureCatalogCmsLabels() {
  const existingTexts = await prisma.siteText.findMany({
    where: {
      key: {
        in: [
          "catalog.product.choose_breadcrumb",
          "catalog.product.out_of_stock",
        ],
      },
    },
    select: { key: true, value: true },
  });
  const existingTextValues = new Map(
    existingTexts.map((text) => [text.key, text.value])
  );
  const defaultValueFor = (label: (typeof CATALOG_CMS_LABELS)[number]) => {
    if (label.key === "catalog.product.breadcrumb_label") {
      return (
        existingTextValues.get("catalog.product.choose_breadcrumb") ??
        label.value
      );
    }
    if (label.key === "catalog.product.out_of_stock_label_detail") {
      return (
        existingTextValues.get("catalog.product.out_of_stock") ?? label.value
      );
    }
    return label.value;
  };

  await prisma.$transaction(
    CATALOG_CMS_LABELS.map((label) => {
      const defaultValue = defaultValueFor(label);
      return (
      prisma.siteText.upsert({
        where: { key: label.key },
        update: { maxLength: label.maxLength, category: label.category },
        create: {
          key: label.key,
          value: defaultValue,
          valueDraft: defaultValue,
          maxLength: label.maxLength,
          category: label.category,
        },
      })
      );
    })
  );
}
