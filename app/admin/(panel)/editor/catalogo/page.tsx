import { listTextsByCategory } from "@/lib/cms-admin";
import { humanizeCmsKey } from "@/lib/cms-labels";
import { CATALOG_CMS_LABELS } from "@/lib/catalog-cms-labels";
import { prisma } from "@/lib/db";
import CmsTextField from "@/components/CmsTextField";

const ECOMMERCE_LABEL_GROUPS = [
  { id: "payment", title: "Chips de pago" },
  { id: "cart", title: "Botones y carrito" },
  { id: "stock", title: "Mensajes de stock" },
  { id: "detail", title: "Detalle de producto" },
] as const;

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
  const textByKey = new Map(texts.map((text) => [text.key, text]));
  const ecommerceLabelKeys = new Set(CATALOG_CMS_LABELS.map((label) => label.key));
  const generalTexts = texts.filter((text) => !ecommerceLabelKeys.has(text.key));

  return (
    <div>
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Productos
      </h2>
      <p className="mb-4 text-sm leading-6 text-muted">
        Editá los textos generales que acompañan la grilla de productos y la
        experiencia de compra.
      </p>
      <div className="space-y-3">
        {generalTexts.map((t) => (
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

      <section className="mt-8">
        <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
          Textos de cards y carrito
        </h2>
        <p className="mb-4 text-sm text-muted">
          Textos repetidos en productos, chips de pago, carrito y detalle de
          producto.
        </p>
        <div className="space-y-6">
          {ECOMMERCE_LABEL_GROUPS.map((group) => {
            const groupLabels = CATALOG_CMS_LABELS.filter(
              (label) => label.group === group.id
            );
            return (
              <section key={group.id}>
                <h3 className="mb-3 font-black uppercase tracking-wide text-sm text-ink">
                  {group.title}
                </h3>
                <div className="space-y-3">
                  {groupLabels.map((label) => {
                    const text = textByKey.get(label.key);
                    if (!text) return null;
                    return (
                      <CmsTextField
                        key={text.key}
                        textKey={text.key}
                        label={label.label}
                        published={text.value}
                        draft={text.valueDraft}
                        style={text.style}
                        styleDraft={text.styleDraft}
                        maxLength={text.maxLength}
                        multiline={text.maxLength > 80}
                        allowStyle={false}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
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
      return prisma.siteText.upsert({
        where: { key: label.key },
        update: { maxLength: label.maxLength, category: label.category },
        create: {
          key: label.key,
          value: defaultValue,
          valueDraft: defaultValue,
          maxLength: label.maxLength,
          category: label.category,
        },
      });
    })
  );
}
