"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HistoryPoint } from "@/lib/pricing-history";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

const SERIES = [
  { key: "costo", label: "Costo", color: "#6b7280" },
  { key: "publico", label: "Público", color: "#111827" },
  { key: "mayorista", label: "Mayorista", color: "#1d4ed8" },
  { key: "kiosco", label: "Kiosco", color: "#15803d" },
];

export default function PriceHistoryChart({
  points,
}: {
  points: HistoryPoint[];
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
        No hay cambios registrados para este producto y empanado en el período.
      </p>
    );
  }

  return (
    <div className="h-80 w-full rounded-lg border border-line bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={40}
          />
          <Tooltip formatter={(v) => pesos(Number(v))} />
          <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
