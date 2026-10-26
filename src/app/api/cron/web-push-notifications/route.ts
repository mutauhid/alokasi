import { timingSafeEqual } from "node:crypto";
import { runScheduledWebPush } from "@/modules/web-push/scheduled";

export const runtime = "nodejs";

function validSecret(actual: string | null, secret: string) {
  if (!actual) return false;
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  if (!validSecret(request.headers.get("authorization"), secret)) {
    return new Response(null, { status: 401 });
  }
  const result = await runScheduledWebPush();
  return Response.json({ ok: true, ...result });
}
