import AdminPlaceholder from "@/components/AdminPlaceholder";

export default function CuentasPorCobrarPage() {
  return (
    <AdminPlaceholder
      title="Cuentas por cobrar"
      description="Acá vas a ver los clientes con saldo pendiente, ordenados por monto, con el detalle de cada venta, los pagos parciales y el aging (0-30 / 31-60 / 60+ días)."
      phase="Fase 2 — cuentas corrientes"
    />
  );
}
