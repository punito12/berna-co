import { COSTOS_TABS } from "@/lib/pricing";
import {
  listCostSheets,
  listProductBreadcrumbsForSheets,
} from "@/lib/cost-sheets";
import SubTabs from "@/components/SubTabs";
import CostSheetsManager from "@/components/CostSheetsManager";

// Catálogo → Costos y Precios (Tab principal): planillas de costos (réplica del
// Excel). Selector producto+empanado; cada planilla es una card calculada.
export default async function CostosPreciosPage({
  searchParams,
}: {
  searchParams: { product?: string; bc?: string };
}) {
  const products = await listProductBreadcrumbsForSheets();

  const productId = searchParams.product || products[0]?.id || "";
  const selected = products.find((p) => p.id === productId);
  const breadcrumbType =
    searchParams.bc || selected?.breadcrumbs[0]?.code || "";

  const sheets =
    productId && breadcrumbType
      ? await listCostSheets(productId, breadcrumbType)
      : [];

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <p className="mb-5 text-sm text-muted">
        Planillas de costos por producto y empanado, réplica del Excel. Cada
        planilla calcula su propio precio final. Son una herramienta de
        referencia: no se promedian ni actualizan el precio de venta.
      </p>
      <CostSheetsManager
        products={products}
        productId={productId}
        breadcrumbType={breadcrumbType}
        sheets={sheets}
      />
    </div>
  );
}
