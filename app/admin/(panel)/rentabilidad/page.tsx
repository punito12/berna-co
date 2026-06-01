import Link from "next/link";
import { getProfitability } from "@/lib/management";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Profitability table: margin (in $ and %) per product and per channel.
// Channels: Minorista (precio público), Mayorista (-25%), Kiosco (-30%).
export default async function AdminProfitabilityPage() {
  const rows = await getProfitability();
  const anyCost = rows.some((r) => r.costPerKg > 0);

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Rentabilidad
      </h1>
      <p className="mb-6 text-sm text-muted">
        Margen por producto y canal. El precio mayorista aplica −25% y el de
        kiosco −30% sobre el precio público. Cargá el{" "}
        <span className="font-bold text-ink">costo x kg</span> de cada producto
        en{" "}
        <Link href="/admin/productos" className="underline">
          Productos
        </Link>
        .
      </p>

      {!anyCost && (
        <p className="mb-6 rounded-lg border border-black bg-white px-4 py-3 text-sm font-bold text-ink">
          Todavía no cargaste costos. Los márgenes van a aparecer cuando
          completes el costo x kg de los productos.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-cream/60">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wide text-[10px] text-muted">
                Producto
              </th>
              <th className="px-4 py-3 text-right font-bold uppercase tracking-wide text-[10px] text-muted">
                Costo/kg
              </th>
              <ChannelHead label="Minorista" />
              <ChannelHead label="Mayorista −25%" />
              <ChannelHead label="Kiosco −30%" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-3 font-bold text-ink">{r.name}</td>
                <td className="px-4 py-3 text-right text-muted">
                  {r.costPerKg > 0 ? pesos(r.costPerKg) : "—"}
                </td>
                {r.channels.map((c) => (
                  <td key={c.channel} className="px-4 py-3 text-right">
                    <div className="font-bold text-ink">
                      {pesos(c.sellPrice)}
                    </div>
                    {r.costPerKg > 0 ? (
                      <div
                        className={
                          c.marginPesos >= 0 ? "text-muted" : "text-ink"
                        }
                      >
                        {pesos(c.marginPesos)} · {c.marginPct.toFixed(0)}%
                      </div>
                    ) : (
                      <div className="text-line">—</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        En cada celda: arriba el precio de venta del canal; abajo el margen en $
        y en %. El % es margen sobre el precio de venta.
      </p>
    </div>
  );
}

function ChannelHead({ label }: { label: string }) {
  return (
    <th className="px-4 py-3 text-right font-bold uppercase tracking-wide text-[10px] text-muted">
      {label}
    </th>
  );
}
