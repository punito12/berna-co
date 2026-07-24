import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { convertProspectToCustomer } from "@/lib/prospects";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const prospect = await convertProspectToCustomer(params.id);
    return NextResponse.json({ ok: true, prospect });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo convertir." },
      { status: 400 }
    );
  }
}

