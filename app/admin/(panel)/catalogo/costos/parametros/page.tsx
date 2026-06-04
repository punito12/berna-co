import { getPricingConfig, COSTOS_TABS } from "@/lib/pricing";
import SubTabs from "@/components/SubTabs";
import PricingConfigForm from "@/components/PricingConfigForm";

// Catálogo → Costos y Precios (Tab 2): global pricing parameters.
export default async function ParametrosPage() {
  const config = await getPricingConfig();

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Parámetros
      </h2>

      {/* Current values */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sueldo" value={`${config.sueldoPercent}%`} />
        <Stat label="Utilidad" value={`${config.utilidadPercent}%`} />
        <Stat label="Dto. mayorista" value={`${config.descuentoMayoristaPercent}%`} />
        <Stat label="Dto. kiosco" value={`${config.descuentoKioscoPercent}%`} />
      </div>

      <p className="mb-4 text-sm text-muted">
        Al guardar, la tabla maestra se recalcula con estos valores (precio
        sugerido y precios por canal).
      </p>

      <PricingConfigForm initial={config} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </p>
      <p className="mt-1 font-black text-xl text-ink">{value}</p>
    </div>
  );
}
