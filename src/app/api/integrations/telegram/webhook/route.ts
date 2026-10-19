import { timingSafeEqual } from "node:crypto";
import { FinanceDomainError } from "@/modules/finance/errors";
import {
  answerTelegramCallback,
  sendTelegramMessage,
} from "@/modules/telegram-integration/bot-api";
import {
  TelegramInputError,
  cancelTelegramDraft,
  confirmTelegramDraft,
  connectTelegram,
  correctTelegramDraft,
  createTelegramDraft,
  findDraftForReply,
  findTelegramConnection,
  getTelegramDraft,
  setTelegramEditPrompt,
} from "@/modules/telegram-integration/service";

export const runtime = "nodejs";

type Message = {
  message_id: number;
  chat: { id: number; type: string };
  from: { id: number };
  text?: string;
  reply_to_message?: { message_id: number };
};
type Callback = {
  id: string;
  from: { id: number };
  data?: string;
  message?: { chat: { id: number; type: string } };
};

function equalSecret(actual: string | null, expected: string) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readLimitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Message>;
  return (
    Number.isSafeInteger(row.message_id) &&
    Number.isSafeInteger(row.chat?.id) &&
    typeof row.chat?.type === "string" &&
    Number.isSafeInteger(row.from?.id)
  );
}

function isCallback(value: unknown): value is Callback {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Callback>;
  return (
    typeof row.id === "string" &&
    Number.isSafeInteger(row.from?.id) &&
    Number.isSafeInteger(row.message?.chat?.id) &&
    typeof row.message?.chat?.type === "string"
  );
}

function summary(
  draft: NonNullable<Awaited<ReturnType<typeof getTelegramDraft>>>,
) {
  const kind = draft.type === "income" ? "pemasukan" : "pengeluaran";
  const amount = new Intl.NumberFormat("id-ID").format(draft.amount);
  const date = new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(draft.transactionDate);
  return [
    `Periksa ${kind}:`,
    `Judul: ${draft.title}`,
    `Nominal: Rp${amount}`,
    `Akun: ${draft.accountName}`,
    `Kategori: ${draft.categoryName}`,
    `Tanggal: ${date}`,
    ...(draft.note ? [`Catatan: ${draft.note}`] : []),
    "",
    "Saldo berubah setelah Anda menekan Simpan.",
  ].join("\n");
}

async function sendSummary(
  chatId: string,
  draft: NonNullable<Awaited<ReturnType<typeof getTelegramDraft>>>,
) {
  await sendTelegramMessage(chatId, summary(draft), {
    inline_keyboard: [
      [
        { text: "✅ Simpan", callback_data: `save:${draft.id}` },
        { text: "✏️ Koreksi", callback_data: `edit:${draft.id}` },
        { text: "❌ Batal", callback_data: `cancel:${draft.id}` },
      ],
    ],
  });
}

async function handleMessage(message: Message) {
  if (message.chat.type !== "private" || typeof message.text !== "string")
    return;
  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const text = message.text.trim();
  const start = /^\/start(?:\s+([A-Za-z0-9_-]{32}))?$/u.exec(text);
  if (start) {
    if (!start[1]) {
      await sendTelegramMessage(
        chatId,
        "Hubungkan Telegram dari Pengaturan Alokasi, lalu buka tautan yang diberikan.",
      );
      return;
    }
    const linked = await connectTelegram(start[1], userId, chatId);
    const alreadyLinked = linked
      ? false
      : Boolean(await findTelegramConnection(userId, chatId));
    await sendTelegramMessage(
      chatId,
      linked || alreadyLinked
        ? "Telegram terhubung. Kirim seperti: beli kopi 25rb bca, atau pemasukan: gaji 5jt bca. Saya akan minta konfirmasi sebelum mencatat."
        : "Tautan tidak berlaku atau akun Telegram ini sudah terhubung. Buat tautan baru dari Pengaturan Alokasi.",
    );
    return;
  }
  const connection = await findTelegramConnection(userId, chatId);
  if (!connection) {
    await sendTelegramMessage(
      chatId,
      "Akun Telegram belum terhubung ke Alokasi. Hubungkan dari Pengaturan Alokasi.",
    );
    return;
  }
  if (text === "/help") {
    await sendTelegramMessage(
      chatId,
      "Pengeluaran: beli kopi 25rb [nama akun]. Pemasukan: pemasukan: gaji 5jt [nama akun]. Tanpa nama akun, akun default dipakai. Periksa draf, lalu Simpan, Koreksi, atau Batal.",
    );
    return;
  }
  const replyId = message.reply_to_message?.message_id;
  const correcting = replyId
    ? await findDraftForReply(connection.id, replyId)
    : null;
  // A retried correction must never be interpreted as a fresh expense draft.
  if (replyId && !correcting) return;
  try {
    if (correcting) {
      const draft = await correctTelegramDraft(connection, correcting.id, text);
      if (draft) await sendSummary(chatId, draft);
      return;
    }
    const result = await createTelegramDraft(
      connection,
      message.message_id,
      text,
    );
    if (
      result.draft.status !== "pending" ||
      result.draft.expiresAt < new Date()
    )
      return;
    const draft = await getTelegramDraft(connection.id, result.draft.id);
    if (draft) await sendSummary(chatId, draft);
  } catch (error) {
    if (!(error instanceof TelegramInputError)) throw error;
    await sendTelegramMessage(chatId, error.message);
  }
}

async function handleCallback(callback: Callback) {
  await answerTelegramCallback(callback.id);
  if (callback.message?.chat.type !== "private" || !callback.data) return;
  const chatId = String(callback.message.chat.id);
  const connection = await findTelegramConnection(
    String(callback.from.id),
    chatId,
  );
  if (!connection) {
    await sendTelegramMessage(
      chatId,
      "Koneksi Alokasi tidak aktif. Hubungkan ulang dari Pengaturan.",
    );
    return;
  }
  const match = /^(save|edit|cancel):([0-9a-f-]{36})$/iu.exec(callback.data);
  if (!match) return;
  const action = match[1];
  const draft = await getTelegramDraft(connection.id, match[2]);
  if (!draft) return;
  if (action === "cancel") {
    const changed = await cancelTelegramDraft(connection.id, draft.id);
    await sendTelegramMessage(
      chatId,
      changed.count
        ? "Draf dibatalkan. Saldo tidak berubah."
        : "Draf sudah selesai.",
    );
    return;
  }
  if (draft.status !== "pending" || draft.expiresAt < new Date()) {
    await sendTelegramMessage(
      chatId,
      draft.status === "confirmed"
        ? "Transaksi ini sudah tercatat."
        : "Draf sudah kedaluwarsa atau dibatalkan. Kirim pesan baru.",
    );
    return;
  }
  if (action === "edit") {
    const promptId = await sendTelegramMessage(
      chatId,
      "Balas pesan ini dengan satu koreksi saja: judul: ..., nominal: 25rb, akun: BCA, kategori: Belanja, atau catatan: keterangan. Bisa juga kirim ulang teks lengkap, misalnya pemasukan: gaji 5jt bca.",
      { force_reply: true, input_field_placeholder: "Tulis koreksi" },
    );
    await setTelegramEditPrompt(connection.id, draft.id, promptId);
    return;
  }
  try {
    const result = await confirmTelegramDraft(connection, draft.id);
    const kind = draft.type === "income" ? "Pemasukan" : "Pengeluaran";
    await sendTelegramMessage(
      chatId,
      result === "created"
        ? `✅ ${kind} ${draft.title} sebesar Rp${new Intl.NumberFormat("id-ID").format(draft.amount)} tercatat di Alokasi.`
        : result === "already"
          ? "Transaksi ini sudah tercatat."
          : "Draf tidak dapat disimpan. Kirim pesan baru.",
    );
  } catch (error) {
    if (!(error instanceof FinanceDomainError)) throw error;
    await sendTelegramMessage(
      chatId,
      "Akun, kategori, atau tanggal draf tidak lagi valid. Koreksi draf atau atur ulang integrasi lalu coba lagi.",
    );
  }
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !process.env.TELEGRAM_BOT_TOKEN)
    return new Response(null, { status: 503 });
  if (
    !equalSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)
  )
    return new Response(null, { status: 401 });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 32768) return new Response(null, { status: 413 });
  let update: unknown;
  try {
    const raw = await readLimitedBody(request);
    if (raw === null) return new Response(null, { status: 413 });
    update = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!update || typeof update !== "object")
    return new Response(null, { status: 400 });
  const row = update as { message?: unknown; callback_query?: unknown };
  try {
    if (isMessage(row.message)) await handleMessage(row.message);
    else if (isCallback(row.callback_query))
      await handleCallback(row.callback_query);
    return Response.json({ ok: true });
  } catch {
    return new Response(null, { status: 500 });
  }
}
