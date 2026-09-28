import { NextResponse } from "next/server";
import { hasValidOrigin } from "./validation";

export function authRedirect(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export function rejectCrossOrigin(request: Request) {
  return hasValidOrigin(request)
    ? null
    : new NextResponse("Permintaan ditolak.", { status: 403 });
}

export function appOrigin() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL belum diatur.");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("APP_URL tidak valid.");
  return url.origin;
}
