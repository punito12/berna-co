import Link from "next/link";
import ArchiveRemitoButton from "@/components/ArchiveRemitoButton";
import DeleteRemitoButton from "@/components/DeleteRemitoButton";
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

type RemitosSearchParams = Record<string, string | string[] | undefined>;

function getParam(
  searchParams: RemitosSearchParams | undefined,
  key: string
): string {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function RemitosPage({
  searchParams,
}: {
  searchParams?: RemitosSearchParams;
}) {
  const remitos = await listRemitos();
  const query = getParam(searchParams, "q");
  const status = getParam(searchParams, "estado");
  const linked = getParam(searchParams, "cliente");
  const from = getParam(searchParams, "desde");
  const to = getParam(searchParams, "hasta");
  const sort = getParam(searchParams, "orden") || "newest";
  const normalizedQuery = normalizeSearch(query);
  const hasFilters =
    normalizedQuery !== "" ||
    status !== "" ||
    linked !== "" ||
    from !== "" ||
    to !== "" ||
    sort !== "newest";
  const visibleRemitos = remitos
    .filter((remito) => {
      const dateValue = dateInputValue(remito.date);
      const searchable = normalizeSearch(
        [
          formatRemitoNumber(remito.number),
          String(remito.number),
          remito.customerName,
          remito.note ?? "",
        ].join(" ")
      );
      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }
      if (status === "activos" && remito.archived) return false;
      if (status === "archivados" && !remito.archived) return false;
      if (linked === "vinculados" && !remito.customerId) return false;
      if (linked === "sin-vincular" && remito.customerId) return false;
      if (from && dateValue < from) return false;
      if (to && dateValue > to) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "oldest") {
        return a.date.getTime() - b.date.getTime() || a.number - b.number;
      }
      if (sort === "number-asc") return a.number - b.number;
      if (sort === "number-desc") return b.number - a.number;
      if (sort === "client") {
        return a.customerName.localeCompare(b.customerName, "es");
      }
      if (sort === "total-asc") return a.total - b.total;
      if (sort === "total-desc") return b.total - a.total;
      return b.date.getTime() - a.date.getTime() || b.number - a.number;
    });

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

      {remitos.length > 0 && (
        <form
          action="/admin/remitos"
          className="mb-4 rounded-lg border border-line bg-white p-4"
        >
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr]">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Buscar
              </span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Número, cliente o nota"
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Desde
              </span>
              <input
                type="date"
                name="desde"
                defaultValue={from}
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Hasta
              </span>
              <input
                type="date"
                name="hasta"
                defaultValue={to}
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Estado
              </span>
              <select
                name="estado"
                defaultValue={status}
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              >
                <option value="">Todos</option>
                <option value="activos">Activos</option>
                <option value="archivados">Archivados</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Cliente
              </span>
              <select
                name="cliente"
                defaultValue={linked}
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              >
                <option value="">Todos</option>
                <option value="vinculados">Vinculados</option>
                <option value="sin-vincular">Sin vincular</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                Orden
              </span>
              <select
                name="orden"
                defaultValue={sort}
                className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              >
                <option value="newest">Más nuevos</option>
                <option value="oldest">Más antiguos</option>
                <option value="number-desc">Número mayor</option>
                <option value="number-asc">Número menor</option>
                <option value="client">Cliente A-Z</option>
                <option value="total-desc">Total mayor</option>
                <option value="total-asc">Total menor</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {visibleRemitos.length} de {remitos.length} remitos
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {hasFilters && (
                <Link
                  href="/admin/remitos"
                  className="text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
                >
                  Limpiar filtros
                </Link>
              )}
              <button
                type="submit"
                className="bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
              >
                Aplicar
              </button>
            </div>
          </div>
        </form>
      )}

      {remitos.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay remitos.
        </p>
      ) : visibleRemitos.length === 0 ? (
        <div className="rounded-lg border border-line bg-white px-4 py-10 text-center">
          <p className="font-bold uppercase tracking-wide text-muted">
            No hay remitos con esos filtros.
          </p>
          <Link
            href="/admin/remitos"
            className="mt-3 inline-block text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
          >
            Limpiar filtros
          </Link>
        </div>
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
              {visibleRemitos.map((remito) => (
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
                      <DeleteRemitoButton
                        id={remito.id}
                        number={remito.number}
                      />
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
