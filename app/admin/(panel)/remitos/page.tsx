import Link from "next/link";
import ArchiveRemitoButton from "@/components/ArchiveRemitoButton";
import {
  formatRemitoMoney,
  formatRemitoNumber,
  listRemitos,
} from "@/lib/remitos";

function shortDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function RemitosPage() {
  const remitos = await listRemitos();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
            Remitos
          </h1>
          <p className="mt-1 text-sm text-muted">
            Creá, editá, imprimí y conservá el historial de remitos.
          </p>
        </div>
        <Link
          href="/admin/remitos/nuevo"
          className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          Nuevo remito
        </Link>
      </div>

      {remitos.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay remitos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Número", "Fecha", "Nombre", "Items", "Total", "Acciones"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted ${
                        i === 4 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {remitos.map((remito) => (
                <tr
                  key={remito.id}
                  className={remito.archived ? "bg-cream/30 opacity-60" : ""}
                >
                  <td className="px-3 py-3 font-black text-ink">
                    {formatRemitoNumber(remito.number)}
                    {remito.archived && (
                      <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                        Archivado
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {shortDate(remito.date)}
                  </td>
                  <td className="px-3 py-3 text-ink">
                    {remito.customerName}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {remito.items.length}
                  </td>
                  <td className="px-3 py-3 text-right font-black text-ink">
                    {formatRemitoMoney(remito.total)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/remitos/${remito.id}/editar`}
                        className="text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/remitos/${remito.id}/imprimir`}
                        className="text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
                      >
                        Imprimir
                      </Link>
                      {!remito.archived && (
                        <ArchiveRemitoButton id={remito.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
