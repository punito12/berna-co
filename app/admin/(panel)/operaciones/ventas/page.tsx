import Link from "next/link";
import {
  listSalesUnified,
  countSalesByStatus,
  SALE_CHANNELS,
  SALE_CHANNEL_LABELS,
  type UnifiedFilters,
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

const CUSTOMER_TYPES = [
  { key: "", label: "Todos" },
  { key: "MINORISTA", label: "Minorista" },
  { key: "MAYORISTA", label: "Mayorista" },
  { key: "KIOSCO", label: "Kiosco" },
];
const STATUS_FILTERS = [
  { key: "", label: "Activos" }, // default: confirmados + entregados
  { key: "CONFIRMED", label: "Confirmados" },
  { key: "DELIVERED", label: "Entregados" },
  { key: "CANCELLED", label: "Cancelados" },
];

// Operaciones → Pedidos y ventas: unified feed with combinable filters (origin,
// customer type, status, date range). Default view hides cancelled; counts per
// status are shown on the status buttons.
export default async function PedidosYVentasPage({
  searchParams,
}: {
  searchParams: {
    origin?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}) {
  const origin = SALE_CHANNELS.includes(
    (searchParams.origin ?? "") as (typeof SALE_CHANNELS)[number]
  )
    ? searchParams.origin
    : undefined;
  const customerType = ["MINORISTA", "MAYORISTA", "KIOSCO"].includes(
    searchParams.type ?? ""
  )
    ? searchParams.type
    : undefined;
  const statusFilter = ["CONFIRMED", "DELIVERED", "CANCELLED"].includes(
    searchParams.status ?? ""
  )
    ? searchParams.status
    : undefined;

  const from = searchParams.from
    ? new Date(`${searchParams.from}T00:00:00`)
    : undefined;
  const to = searchParams.to
    ? (() => {
        const d = new Date(`${searchParams.to}T00:00:00`);
        d.setDate(d.getDate() + 1); // inclusive of the end day
        return d;
      })()
    : undefined;

  const baseFilters: UnifiedFilters = { origin, customerType, from, to };

  const [allRows, counts] = await Promise.all([
    listSalesUnified({ ...baseFilters, status: statusFilter }),
    countSalesByStatus(baseFilters),
  ]);

  // Default (no status filter): show only non-cancelled (activos).
  const rows = statusFilter
    ? allRows
    : allRows.filter((r) => r.status !== "CANCELLED");

  // Helper to build a URL preserving the other filters.
  function hrefWith(patch: Partial<typeof searchParams>): string {
    const sp = new URLSearchParams();
    const merged = {
      origin: searchParams.origin,
      type: searchParams.type,
      status: searchParams.status,
      from: searchParams.from,
      to: searchParams.to,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `/admin/operaciones/ventas${qs ? `?${qs}` : ""}`;
  }

  const statusCount: Record<string, number> = {
    "": counts.activos,
    CONFIRMED: counts.CONFIRMED,
    DELIVERED: counts.DELIVERED,
    CANCELLED: counts.CANCELLED,
  };

  return (
    <div>
      <h1 className="mb-1 font-black uppercase tracking-tight text-3xl text-ink">
        Pedidos y ventas
      </h1>
      <p className="mb-5 text-sm text-muted">
        Pedidos web y ventas manuales en un solo lugar. Tocá una fila para ver
        el detalle.
      </p>

      {/* Filters */}
      <div className="mb-6 space-y-3 rounded-lg border border-line bg-white p-4">
        <FilterRow label="Origen">
          <Chip href={hrefWith({ origin: undefined })} active={!origin}>
            Todos
          </Chip>
          {SALE_CHANNELS.map((c) => (
            <Chip
              key={c}
              href={hrefWith({ origin: c })}
              active={origin === c}
            >
              {SALE_CHANNEL_LABELS[c]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Cliente">
          {CUSTOMER_TYPES.map((t) => (
            <Chip
              key={t.key || "all"}
              href={hrefWith({ type: t.key || undefined })}
              active={(customerType ?? "") === t.key}
            >
              {t.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Estado">
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.key || "all"}
              href={hrefWith({ status: s.key || undefined })}
              active={(statusFilter ?? "") === s.key}
            >
              {s.label} ({statusCount[s.key] ?? 0})
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Fechas">
          <form method="get" className="flex flex-wrap items-center gap-2">
            {origin && <input type="hidden" name="origin" value={origin} />}
            {customerType && (
              <input type="hidden" name="type" value={customerType} />
            )}
            {statusFilter && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
            <input
              type="date"
              name="from"
              defaultValue={searchParams.from}
              className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
            />
            <span className="text-muted">a</span>
            <input
              type="date"
              name="to"
              defaultValue={searchParams.to}
              className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
            />
            <button
              type="submit"
              className="bg-black px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white"
            >
              Aplicar
            </button>
            {(searchParams.from || searchParams.to) && (
              <Link
                href={hrefWith({ from: undefined, to: undefined })}
                className="text-[11px] font-bold uppercase tracking-widest text-muted hover:text-ink"
              >
                Limpiar
              </Link>
            )}
          </form>
        </FilterRow>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          No hay pedidos para este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {["Fecha", "Origen", "Cliente", "Pago", "Estado", "Total"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted ${
                        i >= 5 ? "text-right" : ""
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
                  className={`cursor-pointer transition-colors hover:bg-cream/40 ${
                    r.status === "CANCELLED" ? "opacity-60" : ""
                  }`}
                >
                  <Cell href={r.href}>{shortDate(r.date)}</Cell>
                  <Cell href={r.href}>
                    <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {SALE_CHANNEL_LABELS[r.origin] ?? r.origin}
                    </span>
                  </Cell>
                  <Cell href={r.href}>
                    <span className="text-ink">{r.customerName}</span>
                    {r.customerType && (
                      <span className="ml-1 text-[10px] uppercase text-muted">
                        · {r.customerType}
                      </span>
                    )}
                  </Cell>
                  <Cell href={r.href}>
                    <PaymentBadge label={r.paymentLabel} tone={r.paymentTone} />
                  </Cell>
                  <Cell href={r.href}>
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

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded px-3 py-1.5 font-bold uppercase tracking-wide text-[11px] transition-colors ${
        active
          ? "bg-black text-white"
          : "border border-line text-ink hover:border-black"
      }`}
    >
      {children}
    </Link>
  );
}

const PAYMENT_BADGE_STYLES: Record<string, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-line bg-cream text-muted",
};

function PaymentBadge({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex max-w-[180px] items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
        PAYMENT_BADGE_STYLES[tone] ?? PAYMENT_BADGE_STYLES.neutral
      }`}
    >
      {label}
    </span>
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
