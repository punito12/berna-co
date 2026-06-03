import AdminPlaceholder from "@/components/AdminPlaceholder";

export default function ProduccionPage() {
  return (
    <AdminPlaceholder
      title="Producción"
      description="Acá vas a cargar lo producido (producto, empanado, cantidad en kg, fecha y notas). Cada carga genera un movimiento de stock de tipo PRODUCCIÓN y actualiza el inventario."
      phase="Fase 4 — movimientos de stock"
    />
  );
}
