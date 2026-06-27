"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Gráficos del Resumen de ventas (client, Recharts). Estilo admin: negro/gris +
// un acento. Reciben datos YA preparados por el server (sin cálculo pesado acá).

// Paleta sobria, consistente con el admin (ink + acento + grises).
const INK = "#0A0A0A";
const ACCENT = "#c0392b";
const GRAY = "#9c948c";
const SERIES = [INK, ACCENT, "#6B6560", "#b08968", "#3f6212", "#1d4ed8", "#a16207"];

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
function kgFmt(n: number): string {
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg`;
}

const tooltipStyle = {
  border: "1px solid #E8E3DC",
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

// Donut de participación por facturación neta (Mayorista vs Minorista).
export function RevenueShareDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total <= 0) {
    return <ChartEmpty />;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? INK : ACCENT} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => pesos(Number(v))}
          contentStyle={tooltipStyle}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Barras verticales de kg por corte.
export function CorteBarChart({
  data,
}: {
  data: { corte: string; kg: number }[];
}) {
  if (data.every((d) => d.kg <= 0)) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" vertical={false} />
        <XAxis
          dataKey="corte"
          tick={{ fontSize: 10, fill: GRAY }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={56}
        />
        <YAxis tick={{ fontSize: 10, fill: GRAY }} width={36} />
        <Tooltip formatter={(v) => kgFmt(Number(v))} contentStyle={tooltipStyle} />
        <Bar dataKey="kg" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras horizontales para rankings (productos por facturación o kg, clientes).
export function HorizontalBarChart({
  data,
  unit,
}: {
  data: { name: string; value: number }[];
  unit: "money" | "kg";
}) {
  if (data.length === 0 || data.every((d) => d.value <= 0)) return <ChartEmpty />;
  const fmt = unit === "money" ? pesos : kgFmt;
  const height = Math.max(160, data.length * 38);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: GRAY }} hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: INK }}
          width={150}
        />
        <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
      Sin datos para graficar.
    </div>
  );
}
