import { NextResponse } from "next/server";
import { getPaymentConfig } from "@/lib/payment-config";

// Public: payment-method discounts + transfer instructions (alias/CBU/WhatsApp).
// These are meant to be shown to the customer, so none are secret.
export async function GET() {
  const config = await getPaymentConfig();
  return NextResponse.json({ config });
}
