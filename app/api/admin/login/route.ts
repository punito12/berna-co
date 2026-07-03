import { NextResponse } from "next/server";
import { ADMIN_COOKIE, tokenForPassword, isAdminConfigured } from "@/lib/auth";
import {
  checkAdminLoginRateLimit,
  getAdminLoginRequestKey,
  logRateLimitedAdminLogin,
  recordAdminLoginFailure,
  recordAdminLoginSuccess,
} from "@/lib/admin-login-rate-limit";

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

  const requestKey = getAdminLoginRequestKey(request);
  const limit = checkAdminLoginRateLimit(requestKey);
  if (!limit.allowed) {
    logRateLimitedAdminLogin(requestKey, limit.lockedUntil);
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      }
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
    const failure = recordAdminLoginFailure(requestKey);
    if (failure.locked) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá unos minutos y volvé a probar." },
        {
          status: 429,
          headers: {
            "Retry-After": String(failure.retryAfterSeconds),
          },
        }
      );
    }
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 401 }
    );
  }

  recordAdminLoginSuccess(requestKey);

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
