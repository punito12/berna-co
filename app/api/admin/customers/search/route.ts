import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { searchCustomers } from "@/lib/management";

// Searches customers by name or barrio. Admin-only.
export async function GET(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const customers = await searchCustomers(q);
  return NextResponse.json(
    customers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      barrio: c.barrio?.name ?? null,
      lot: c.lot ?? null,
      defaultDiscount: c.defaultDiscount,
      phone: c.phone,
      orders: c._count.orders + c._count.sales,
    }))
  );
}
