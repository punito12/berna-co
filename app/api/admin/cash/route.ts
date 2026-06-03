import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createManualIncome, createExpense } from "@/lib/cash";

// Create a Caja movement (manual income or expense). Admin-only.
// POST { kind: "INCOME"|"EXPENSE", date, amount, description, source?, category? }
export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    kind?: string;
    date?: string;
    amount?: number;
    description?: string;
    source?: string;
    category?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    if (body.kind === "INCOME") {
      await createManualIncome({
        date: body.date ?? "",
        amount: Number(body.amount),
        description: body.description ?? "",
        source: body.source ?? "",
      });
    } else if (body.kind === "EXPENSE") {
      await createExpense({
        date: body.date ?? "",
        amount: Number(body.amount),
        description: body.description ?? "",
        category: body.category ?? "",
      });
    } else {
      return NextResponse.json(
        { error: "Tipo de movimiento inválido." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo guardar." },
      { status: 400 }
    );
  }
}
