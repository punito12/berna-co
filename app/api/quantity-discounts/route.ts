import { NextResponse } from "next/server";
import { listActiveQuantityTiers } from "@/lib/quantity-discounts";

// Public: the active volume-discount tiers, so the cart/checkout can show the
// motivational message and the applied discount. (The server recomputes the
// real discount at order creation.)
export async function GET() {
  const tiers = await listActiveQuantityTiers();
  return NextResponse.json({ tiers });
}
