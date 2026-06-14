import { prisma } from "@/lib/db";
import { CATALOG_CMS_LABELS } from "@/lib/catalog-cms-labels";

// Crea (idempotente) las filas SiteText de los labels del catálogo si todavía no
// existen. Nunca pisa valores existentes (upsert: update solo maxLength/category;
// create con el default). Antes vivía dentro del editor clásico de catálogo; se
// extrajo a lib para que el editor visual también pueda garantizar las filas.
export async function ensureCatalogCmsLabels(): Promise<void> {
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
