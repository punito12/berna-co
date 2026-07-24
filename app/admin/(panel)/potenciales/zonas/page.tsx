import ProspectZoneManager from "@/components/ProspectZoneManager";
import { listProspectZonesAndScans } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function ProspectZonesPage() {
  const data = await listProspectZonesAndScans();
  return (
    <div>
      <div className="mb-5 rounded-lg border border-line bg-white p-4">
        <p className="text-sm text-muted">
          El scan se crea en segundos y queda en cola. Vercel Cron procesa
          lotes cortos cada cinco minutos; también podés ejecutar el worker
          local. Ningún scan pago empieza sin estimación y confirmación.
        </p>
      </div>
      <ProspectZoneManager {...data} />
    </div>
  );
}

