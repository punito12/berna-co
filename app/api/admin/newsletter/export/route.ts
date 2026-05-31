import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listSubscribers } from "@/lib/newsletter";

// Downloads all newsletter subscribers as a CSV file. Admin-only.
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const subscribers = await listSubscribers();

  // Build CSV: header + one row per subscriber. Emails are simple (no commas),
  // but we still quote to be safe.
  const lines = ["email,fecha_alta"];
  for (const s of subscribers) {
    const date = s.createdAt.toISOString().slice(0, 10);
    lines.push(`"${s.email}","${date}"`);
  }
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-berna-co.csv"`,
    },
  });
}
