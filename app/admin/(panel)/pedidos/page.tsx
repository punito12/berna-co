import { redirect } from "next/navigation";

// The standalone orders screen is gone — web orders now live in the unified
// "Pedidos y ventas" view. Redirect any old link/bookmark there.
export default function AdminOrdersRedirect() {
  redirect("/admin/operaciones/ventas");
}
