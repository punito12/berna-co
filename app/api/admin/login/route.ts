import { NextResponse } from "next/server";
import { ADMIN_COOKIE, tokenForPassword, isAdminConfigured } from "@/lib/auth";

// Validates the admin password and sets the session cookie on success.
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    console.error("[admin login] ADMIN_PASSWORD no está configurado.");
    return NextResponse.json(
      {
        error: "No se pudo iniciar sesión.",
      },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const token = tokenForPassword(body.password ?? "");
  if (!token) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
