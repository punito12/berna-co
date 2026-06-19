"use client";

import dynamic from "next/dynamic";
import type { HistoryPoint } from "@/lib/pricing-history";

// Carga diferida del gráfico de recharts (pesado, ~100 kB). Solo se baja en el
// cliente cuando se abre la página de histórico, no en el bundle inicial del
// admin. `ssr: false` evita renderizarlo en el server (recharts es client-only).
const PriceHistoryChart = dynamic(() => import("@/components/PriceHistoryChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-lg border border-line bg-white text-sm text-muted">
      Cargando gráfico…
    </div>
  ),
});

export default function PriceHistoryChartLazy({
  points,
}: {
  points: HistoryPoint[];
}) {
  return <PriceHistoryChart points={points} />;
}
