import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expectedSecret = process.env.SENTRY_TEST_SECRET;
  const canThrow =
    process.env.NODE_ENV !== "production" ||
    (Boolean(expectedSecret) && secret === expectedSecret);

  if (!canThrow) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  throw new Error("Sentry test error from Berna");
}
