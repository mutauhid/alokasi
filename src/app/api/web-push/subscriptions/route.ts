import { z } from "zod";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import {
  revokeWebPushSubscription,
  saveWebPushSubscription,
} from "@/modules/web-push/service";
import { rejectCrossOrigin } from "@/server/auth/http";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  workspaceId: z.uuid(),
  endpoint: z.url().max(2048),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string().min(40).max(180),
    auth: z.string().min(12).max(64),
  }),
});

const revokeSchema = z.object({
  workspaceId: z.uuid(),
  endpoint: z.url().max(2048),
});

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const identity = await requireVerifiedIdentity();
  let parsed;
  try {
    parsed = subscriptionSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: "INVALID_SUBSCRIPTION" }, { status: 422 });
  }
  const access = await requireWorkspaceAccess(
    identity,
    parsed.data.workspaceId,
  );
  try {
    await saveWebPushSubscription(
      access,
      parsed.data,
      request.headers.get("user-agent"),
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "WEB_PUSH_FAILED";
    return Response.json(
      { error: code },
      { status: code === "WEB_PUSH_NOT_CONFIGURED" ? 503 : 422 },
    );
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const identity = await requireVerifiedIdentity();
  let parsed;
  try {
    parsed = revokeSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: "INVALID_SUBSCRIPTION" }, { status: 422 });
  }
  const access = await requireWorkspaceAccess(
    identity,
    parsed.data.workspaceId,
  );
  await revokeWebPushSubscription(access.actorId, parsed.data.endpoint);
  return new Response(null, { status: 204 });
}
