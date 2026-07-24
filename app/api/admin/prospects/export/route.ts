import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exportProspectsCsv, type ProspectFilters } from "@/lib/prospects";

function bool(value: string | null): boolean {
  return value === "1" || value === "true";
}

function number(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const params = new URL(request.url).searchParams;
    const filters: ProspectFilters = {
      search: params.get("search") || undefined,
      minScore: number(params.get("minScore")),
      maxScore: number(params.get("maxScore")),
      province: params.get("province") || undefined,
      locality: params.get("locality") || undefined,
      neighborhood: params.get("neighborhood") || undefined,
      tier: params.get("tier") || undefined,
      category: params.get("category") || undefined,
      source: params.get("source") || undefined,
      minReviews: number(params.get("minReviews")),
      operatingStatus: params.get("operatingStatus") || undefined,
      status: params.get("status") || undefined,
      onlyNew: bool(params.get("onlyNew")),
      ambiguous: bool(params.get("ambiguous")),
      possibleDuplicates: bool(params.get("possibleDuplicates")),
      excludeExistingClients: bool(params.get("excludeExistingClients")),
      excludeReviewed: bool(params.get("excludeReviewed")),
      includeExcluded: bool(params.get("includeExcluded")),
      sort: params.get("sort") || undefined,
    };
    const csv = await exportProspectsCsv(filters);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="puntos-potenciales-berna.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("prospect export error:", error);
    return NextResponse.json(
      { error: "No se pudo generar la exportación." },
      { status: 500 }
    );
  }
}

