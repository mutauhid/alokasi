import { randomUUID } from "node:crypto";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createLocalReceiptDraftInput } from "../../src/modules/receipts/domain";
import { createShortcutReceiptDraft } from "../../src/modules/receipts/service";
import {
  authenticateShortcutToken,
  configureShortcutIntegration,
  hashShortcutToken,
} from "../../src/modules/shortcut-integration/service";
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import { getDatabase } from "../../src/server/db/client";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId: string;
let ownerId: string;
let viewerId: string;
let accountId: string;
let categoryId: string;

beforeAll(() => {
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL wajib menunjuk PostgreSQL khusus test yang sudah dimigrasi.",
    );
  }
  process.env.DATABASE_URL = connectionString;
  db = getDatabase();
});

beforeEach(async () => {
  ownerId = randomUUID();
  viewerId = randomUUID();
  await db.user.createMany({
    data: [ownerId, viewerId].map((id, index) => ({
      id,
      authSubject: randomUUID(),
      email: `shortcut-${index}-${id}@example.invalid`,
    })),
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Shortcut fixture",
      type: "shared",
      memberships: {
        create: [
          { userId: ownerId, role: "owner", status: "active" },
          { userId: viewerId, role: "viewer", status: "active" },
        ],
      },
    },
  });
  workspaceId = workspace.id;
  const [account, category] = await Promise.all([
    db.financialAccount.create({
      data: {
        workspaceId,
        name: "BCA",
        type: "bank",
        openingBalance: 0n,
        openingDate: new Date("2026-10-01T00:00:00.000Z"),
      },
    }),
    db.category.create({
      data: {
        workspaceId,
        name: "Belanja",
        nameKey: "belanja",
        type: "expense",
      },
    }),
  ]);
  accountId = account.id;
  categoryId = category.id;
});

afterEach(async () => {
  if (workspaceId)
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  await db.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } });
});

describe("iPhone Shortcut receipt service", () => {
  it("stores only a token hash and creates one inert private draft", async () => {
    const configured = await configureShortcutIntegration(
      { workspaceId, actorId: ownerId, role: "owner" },
      { accountId, categoryId },
    );
    const membership = await db.membership.findFirstOrThrow({
      where: { workspaceId, userId: ownerId },
    });
    expect(membership.shortcutTokenHash).toBe(
      hashShortcutToken(configured.token),
    );
    expect(membership.shortcutTokenHash).not.toContain(configured.token);

    const authenticated = await authenticateShortcutToken(configured.token);
    const input = createLocalReceiptDraftInput.parse({
      amount: "86900",
      transactionDate: "2026-10-08",
      merchant: "Shopee Marketplace",
      note: "",
      institution: "ShopeePay",
      evidenceKind: "receipt",
      paymentRail: "",
      ocrConfidence: 0,
      amountConfidence: 35,
      dateConfidence: 16,
      merchantConfidence: 22,
      institutionConfidence: 28,
    });
    const first = await createShortcutReceiptDraft(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2026-10-08T00:00:00.000Z"),
      },
      input,
      {
        accountId: authenticated.shortcutDefaultAccountId!,
        categoryId: authenticated.shortcutDefaultCategoryId!,
        tokenHash: authenticated.shortcutTokenHash!,
      },
    );
    const retry = await createShortcutReceiptDraft(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2026-10-08T00:00:00.000Z"),
      },
      input,
      {
        accountId,
        categoryId,
        tokenHash: authenticated.shortcutTokenHash!,
      },
    );
    expect(first.reused).toBe(false);
    expect(retry.reused).toBe(true);
    expect(retry.draft.id).toBe(first.draft.id);
    expect(first.draft).toMatchObject({
      sourceKind: "ios_shortcut",
      selectedAccountId: accountId,
      suggestedCategoryId: categoryId,
      status: "needs_review",
      extractedMerchant: "Shopee Marketplace",
    });
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);
  });

  it("does not issue a token to a Viewer", async () => {
    await expect(
      configureShortcutIntegration(
        { workspaceId, actorId: viewerId, role: "viewer" },
        { accountId, categoryId },
      ),
    ).rejects.toMatchObject({ code: "SHORTCUT_ACCESS_DENIED" });
  });
});
