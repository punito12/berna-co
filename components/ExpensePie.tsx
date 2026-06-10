"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// Simple pie chart of expenses by category. Colors are assigned by the
// category's position in the canonical list so they stay stable month to month.
const COLORS = [
  "#b91c1c", // Materia Prima
  "#c2410c", // Packaging
  "#a16207", // Delivery/Flete
  "#15803d", // Sueldos
  "#1d4ed8", // Servicios
  "#6b7280", // Otros
];

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ExpensePie({
  data,
  categories,
}: {
  data: { category: string; total: number }[];
  categories: string[];
}) {
  const colorFor = (cat: string) => {
    const i = categories.indexOf(cat);
    return COLORS[i >= 0 ? i % COLORS.length : COLORS.length - 1];
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={colorFor(d.category)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => pesos(Number(value))}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
