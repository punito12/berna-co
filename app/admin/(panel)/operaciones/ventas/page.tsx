import Link from "next/link";
import {
  listSalesUnified,
  SALE_CHANNELS,
  SALE_CHANNEL_LABELS,
} from "@/lib/management";
import { ORDER_STATUS_LABELS } from "@/lib/admin";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// Operaciones → Pedidos y ventas: unified feed of web orders + manual sales.
// Each row opens the unified detail. (Part 1 — full filters land in Part 2.)
export default async function PedidosYVentasPage({
  searchParams,
}: {
  searchParams: { origin?: string };
}) {
  const origin = SALE_CHANNELS.includes(
    (searchParams.origin ?? "") as (typeof SALE_CHANNELS)[number]
  )
    ? searchParams.origin
    : undefined;

  // Default view hides cancelled (they appear only under that status filter).
  const rows = (await listSalesUnified({ origin })).filter(
    (r) => r.status !== "CANCELLED"
  );

  const FILTERS = [
    { key: "", label: "Todos" },
    ...SALE_CHANNELS.map((c) => ({ key: c, label: SALE_CHANNEL_LABELS[c] })),
  ];

  return (
    <div>
      <h1 className="mb-1 font-black uppercase tracking-tight text-3xl text-ink">
        Pedidos y ventas
      </h1>
      <p className="mb-5 text-sm text-muted">
        Pedidos web y ventas manuales en un solo lugar, filtrables por origen.
      </p>

      {/* Origin filter */}
      <div className="mb-6 flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const active = (origin ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={
                f.key
                  ? `/admin/operaciones/ventas?origin=${f.key}`
                  : "/admin/operaciones/ventas"
              }
              className={`px-3 py-2 font-bold uppercase tracking-wide text-xs transition-colors ${
                active
                  ? "bg-black text-white"
                  : "border border-line text-ink hover:border-black"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          No hay ventas para este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Fecha", "Origen", "Cliente", "Ítems", "Estado", "Total"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                        i >= 3 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr
                  key={`${r.kind}-${r.id}`}
                  className="cursor-pointer transition-colors hover:bg-cream/40"
                >
                  <Cell href={r.href}>{shortDate(r.date)}</Cell>
                  <Cell href={r.href}>
                    <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {SALE_CHANNEL_LABELS[r.origin] ?? r.origin}
                    </span>
                  </Cell>
                  <Cell href={r.href}>
                    <span className="text-ink">{r.customerName}</span>
                  </Cell>
                  <Cell href={r.href} align="right">
                    <span className="text-muted">{r.itemsCount}</span>
                  </Cell>
                  <Cell href={r.href} align="right">
                    <span className="text-muted">
                      {ORDER_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </Cell>
                  <Cell href={r.href} align="right">
                    <span className="font-bold text-ink">{pesos(r.total)}</span>
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// A table cell that links to the detail (whole cell is the click target).
function Cell({
  href,
  align,
  children,
}: {
  href: string;
  align?: "right";
  children: React.ReactNode;
}) {
  return (
    <td className="p-0">
      <Link
        href={href}
        className={`block px-3 py-2.5 ${align === "right" ? "text-right" : ""}`}
      >
        {children}
      </Link>
    </td>
  );
}
