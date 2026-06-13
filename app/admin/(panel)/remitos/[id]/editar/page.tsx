import Link from "next/link";
import { notFound } from "next/navigation";
import RemitoForm from "@/components/RemitoForm";
import { formatRemitoNumber, getRemito } from "@/lib/remitos";

function dateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditarRemitoPage({
  params,
}: {
  params: { id: string };
}) {
  const remito = await getRemito(params.id);
  if (!remito) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/remitos"
        className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
      >
        ‹ Volver a remitos
      </Link>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Editar {formatRemitoNumber(remito.number)}
      </h1>
      <RemitoForm
        initial={{
          id: remito.id,
          date: dateInput(remito.date),
          customerName: remito.customerName,
          items: remito.items.map((item) => ({
            quantity: String(item.quantity),
            unit: item.unit === "paq." ? "paq." : "kg",
            description: item.description,
            unitPrice: String(item.unitPrice),
          })),
          discountPercent: String(remito.discountPercent),
          discountAmount: String(remito.discountAmount),
          paymentMethod: remito.paymentMethod,
          note: remito.note,
          receivedSignature: remito.receivedSignature,
          receivedClarification: remito.receivedClarification,
          receivedDate: dateInput(remito.receivedDate),
        }}
      />
    </div>
  );
}
