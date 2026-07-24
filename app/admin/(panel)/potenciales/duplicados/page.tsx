import ProspectDuplicateReview from "@/components/ProspectDuplicateReview";
import { listProspectDuplicates } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function ProspectDuplicatesPage() {
  const rows = await listProspectDuplicates();
  return (
    <div>
      <div className="mb-5 rounded-lg border border-line bg-white p-4">
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">
          Revisión de duplicados
        </h2>
        <p className="mt-1 text-sm text-muted">
          El sistema solo fusiona automáticamente coincidencias claras. La
          cercanía geográfica con nombres similares queda acá para decisión manual.
        </p>
      </div>
      <ProspectDuplicateReview rows={rows} />
    </div>
  );
}

