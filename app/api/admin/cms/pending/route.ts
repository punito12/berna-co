import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { countPendingChanges } from "@/lib/cms-admin";

// Pending (unpublished) changes summary, for the editor status badge.
export async function GET() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const pending = await countPendingChanges();
  return NextResponse.json({ pending });
}
