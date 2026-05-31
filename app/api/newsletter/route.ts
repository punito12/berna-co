import { NextResponse } from "next/server";
import { subscribe, NewsletterError } from "@/lib/newsletter";

// Public endpoint: subscribe an email to the newsletter (from the footer form).
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await subscribe(body.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NewsletterError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("newsletter error:", error);
    return NextResponse.json(
      { error: "No pudimos suscribirte. Probá de nuevo." },
      { status: 500 }
    );
  }
}
