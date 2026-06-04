import { buildPricingTable, COSTOS_TABS } from "@/lib/pricing";
import SubTabs from "@/components/SubTabs";
import PricingTable from "@/components/PricingTable";

// Catálogo → Costos y Precios (Tab "Precios"): the master price table (cost +
// public/mayorista/kiosco prices + margins). Cost here is a manual reference
// number — it isn't fed automatically by the cost sheets.
export default async function PreciosPage() {
  const { config, rows } = await buildPricingTable();

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Precios
      </h2>
      <p className="mb-5 text-sm text-muted">
        Precio sugerido = costo × (1 + sueldo {config.sueldoPercent}% + utilidad{" "}
        {config.utilidadPercent}%). Mayorista −{config.descuentoMayoristaPercent}%
        · Kiosco −{config.descuentoKioscoPercent}% sobre el público. El costo acá
        es un número de referencia; las planillas no lo actualizan solas.
      </p>
      <PricingTable rows={rows} />
    </div>
  );
}
