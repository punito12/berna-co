import SubTabs from "@/components/SubTabs";
import { PROSPECT_TABS } from "@/lib/prospects";

export default function PotentialPointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
          Expansión mayorista
        </p>
        <h1 className="mt-1 font-black uppercase tracking-tight text-3xl text-ink">
          Puntos potenciales de venta
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Descubrí locales físicos, medí su encaje comercial y organizá la
          revisión sin recolectar datos de contacto.
        </p>
      </div>
      <SubTabs tabs={[...PROSPECT_TABS]} />
      {children}
    </div>
  );
}

