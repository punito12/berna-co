import { redirect } from "next/navigation";

export default function LegacyFacturacionPage() {
  redirect("/admin/operaciones/resumen-ventas");
}
