"use client";

import { useRouter } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/lib/products";

type ProductOption = { id: string; name: string; breadcrumbs: string[] };

// Selector for product + empanado + date range, driven via URL query params.
export default function HistorySelector({
  products,
  productId,
  breadcrumbType,
  from,
  to,
}: {
  products: ProductOption[];
  productId: string;
  breadcrumbType: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const product = products.find((p) => p.id === productId);

  function go(next: {
    product?: string;
    bc?: string;
    from?: string;
    to?: string;
  }) {
    const sp = new URLSearchParams();
    const pid = next.product ?? productId;
    let bc = next.bc ?? breadcrumbType;
    // If switching product, default the empanado to its first one.
    if (next.product && next.product !== productId) {
      const p = products.find((x) => x.id === next.product);
      bc = p?.breadcrumbs[0] ?? "";
    }
    if (pid) sp.set("product", pid);
    if (bc) sp.set("bc", bc);
    const f = next.from ?? from;
    const t = next.to ?? to;
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    router.push(`/admin/catalogo/costos/historico?${sp.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Producto
        </span>
        <select
          value={productId}
          onChange={(e) => go({ product: e.target.value })}
          className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">— Elegí —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Empanado
        </span>
        <select
          value={breadcrumbType}
          onChange={(e) => go({ bc: e.target.value })}
          disabled={!product}
          className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          {!product && <option value="">—</option>}
          {product?.breadcrumbs.map((b) => (
            <option key={b} value={b}>
              {BREADCRUMB_LABELS[b] ?? b}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Desde
        </span>
        <input
          type="date"
          value={from}
          onChange={(e) => go({ from: e.target.value })}
          className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Hasta
        </span>
        <input
          type="date"
          value={to}
          onChange={(e) => go({ to: e.target.value })}
          className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
        />
      </label>
    </div>
  );
}
