"use client";

import dynamic from "next/dynamic";

// Wrappers con carga diferida (ssr:false) para que Recharts NO entre al bundle
// inicial del admin: solo se baja en el cliente al abrir el resumen.
const loading = () => (
  <div className="flex h-[220px] items-center justify-center rounded-lg border border-line bg-white text-sm text-muted">
    Cargando gráfico…
  </div>
);

export const RevenueShareDonut = dynamic(
  () => import("@/components/SalesCharts").then((m) => m.RevenueShareDonut),
  { ssr: false, loading }
);
export const CorteBarChart = dynamic(
  () => import("@/components/SalesCharts").then((m) => m.CorteBarChart),
  { ssr: false, loading }
);
export const HorizontalBarChart = dynamic(
  () => import("@/components/SalesCharts").then((m) => m.HorizontalBarChart),
  { ssr: false, loading }
);
export const ComparisonBars = dynamic(
  () => import("@/components/SalesCharts").then((m) => m.ComparisonBars),
  { ssr: false, loading }
);
