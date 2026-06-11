import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAuthenticated } from "@/lib/auth";

// Clears the admin session cookie.
export async function POST() {
  if (!isAuthenticated())
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
