import Link from "next/link";
import PresupuestoForm from "@/components/PresupuestoForm";
import { listPresupuestoProductOptions } from "@/lib/presupuestos";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export const dynamic = "force-dynamic";

export default async function NuevoPresupuestoPage() {
  const products = await listPresupuestoProductOptions();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/operaciones/presupuestos"
        className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
      >
        ‹ Volver a presupuestos
      </Link>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Nuevo presupuesto
      </h1>
      <PresupuestoForm
        products={products}
        initial={{
          type: "PRICE_LIST",
          customerName: "",
          customerId: null,
          date: todayIso(),
          validUntil: "",
          discountPercent: "25",
          notesInternal: "",
          items: [],
        }}
      />
    </div>
  );
}
