import { buildPricingTable, COSTOS_TABS } from "@/lib/pricing";
import SubTabs from "@/components/SubTabs";
import PricingTable from "@/components/PricingTable";

// Catálogo → Costos y Precios (Tab 1): the master cost/price table.
export default async function CostosPreciosPage() {
  const { config, rows } = await buildPricingTable();

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <p className="mb-5 text-sm text-muted">
        Precio sugerido = costo × (1 + sueldo {config.sueldoPercent}% + utilidad{" "}
        {config.utilidadPercent}%). Mayorista −{config.descuentoMayoristaPercent}%
        · Kiosco −{config.descuentoKioscoPercent}% sobre el público. Tocá un costo
        o precio para editarlo.
      </p>
      <PricingTable rows={rows} />
    </div>
  );
}
