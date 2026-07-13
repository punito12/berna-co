import { NextResponse, type NextRequest } from "next/server";

// Corta /admin y /api/admin ANTES de renderizar nada: sin esto, una visita
// anónima a /admin ejecutaba el dashboard completo (~17 consultas a Neon)
// solo para terminar en el redirect del layout. La validación acá es la MISMA
// que en lib/auth (cookie = sha256 hex de ADMIN_PASSWORD) pero con Web Crypto,
// que es lo que existe en el runtime Edge — no importar lib/auth acá (usa
// node:crypto y next/headers). El layout y las APIs siguen validando
// server-side como segunda línea.

// Debe coincidir con ADMIN_COOKIE en lib/auth.ts.
const ADMIN_COOKIE = "berna-admin";

// Alcanzables sin sesión: login (página + API) y logout (borrar la cookie
// tiene que funcionar siempre, incluso con una cookie ya inválida).
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Comparación en tiempo constante (no cortar en el primer byte distinto).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PUBLIC_ADMIN_PATHS.has(pathname)) {
    const password = process.env.ADMIN_PASSWORD;
    const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid =
      Boolean(password && cookie) &&
      safeEqual(cookie as string, await sha256Hex(password as string));

    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.search = "";
      return NextResponse.redirect(login);
    }
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
