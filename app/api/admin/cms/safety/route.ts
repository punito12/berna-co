import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { validateCmsDrafts } from "@/lib/cms-publish";

export async function GET() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const issues = await validateCmsDrafts();
    return NextResponse.json({ issues });
  } catch (error) {
    console.error("[cms safety]", error);
    return NextResponse.json(
      { error: "No se pudo validar el CMS." },
      { status: 500 }
    );
  }
}
