import VisualEditor from "@/components/VisualEditor";
import { getCmsPreviewToken } from "@/lib/cms-preview";
import { getAvailableProducts } from "@/lib/products";
import { listSectionsAdmin } from "@/lib/cms-admin";
import { ensureCatalogCmsLabels } from "@/lib/cms-catalog-texts";
import { prisma } from "@/lib/db";

// Editor visual (Phase 0/1/2B). Server component: calcula el token de preview, el
// slug del primer producto y carga las filas del CMS actual (secciones del Home +
// textos de home/catálogo/footer) para que el panel lateral muestre los controles
// REALES reutilizando los componentes/APIs existentes. CmsEditorShell le da lienzo
// completo (sin el menú del CMS clásico).
export const dynamic = "force-dynamic";

export default async function VisualEditorPage() {
  const token = getCmsPreviewToken();
  // Garantiza (idempotente) que existan las filas de textos del catálogo, así el
  // editor visual puede mostrar todos los labels de las tarjetas. No pisa valores.
  await ensureCatalogCmsLabels().catch(() => {});
  const [products, homeSections, texts, content] = await Promise.all([
    getAvailableProducts().catch(() => []),
    listSectionsAdmin("home").catch(() => []),
    prisma.siteText
      .findMany({
        where: { category: { in: ["home", "catalogo", "footer"] } },
        select: {
          key: true,
          value: true,
          valueDraft: true,
          style: true,
          styleDraft: true,
          maxLength: true,
        },
      })
      .catch(() => []),
    prisma.siteContent
      .findFirst({ select: { logoUrl: true, logoUrlDraft: true } })
      .catch(() => null),
  ]);
  const productSlug = products[0]?.slug ?? null;
  // Logo de borrador (lo que se ve en la vista previa del editor).
  const logoUrl = content?.logoUrlDraft || content?.logoUrl || "";

  return (
    <VisualEditor
      previewToken={token}
      productSlug={productSlug}
      sections={homeSections.map((s) => ({
        key: s.key,
        type: s.type,
        configDraft: s.configDraft,
      }))}
      texts={texts}
      logoUrl={logoUrl}
    />
  );
}
