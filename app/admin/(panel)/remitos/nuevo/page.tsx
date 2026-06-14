import Link from "next/link";
import RemitoForm from "@/components/RemitoForm";
import {
  getNextRemitoNumber,
  listRemitoProductOptions,
  padRemitoNumber,
} from "@/lib/remitos";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function NuevoRemitoPage() {
  const [products, nextNumber] = await Promise.all([
    listRemitoProductOptions(),
    getNextRemitoNumber(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/remitos"
        className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
      >
        ‹ Volver a remitos
      </Link>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Nuevo remito
      </h1>
      <RemitoForm
        products={products}
        initial={{
          number: padRemitoNumber(nextNumber),
          date: todayIso(),
          customerName: "",
          items: [],
          discountPercent: "0",
          discountAmount: "",
          paymentMethod: "",
          note: "",
          receivedSignature: "",
          receivedClarification: "",
          receivedDate: "",
        }}
      />
    </div>
  );
}
