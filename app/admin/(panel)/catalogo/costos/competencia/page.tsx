import { COSTOS_TABS } from "@/lib/pricing";
import {
  listCompetitorPrices,
  getComparison,
  listProductNames,
} from "@/lib/competition";
import SubTabs from "@/components/SubTabs";
import CompetitionManager from "@/components/CompetitionManager";

// Catálogo → Costos y Precios (Tab 4): competitor prices + comparison.
export default async function CompetenciaPage() {
  const [competitors, comparison, productNames] = await Promise.all([
    listCompetitorPrices(),
    getComparison(),
    listProductNames(),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Competencia
      </h2>
      <p className="mb-5 text-sm text-muted">
        Cargá los precios por kg de la competencia (con el nombre de tu producto
        para que matchee). Verde = estás más barato; rojo = más de 15% por
        encima del promedio.
      </p>
      <CompetitionManager
        competitors={competitors.map((c) => ({
          id: c.id,
          productName: c.productName,
          competitor: c.competitor,
          pricePerKg: c.pricePerKg,
        }))}
        comparison={comparison}
        productNames={productNames}
      />
    </div>
  );
}
