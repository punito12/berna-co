import Link from "next/link";
import RemitoForm from "@/components/RemitoForm";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NuevoRemitoPage() {
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
        initial={{
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
