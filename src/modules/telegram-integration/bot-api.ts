import "server-only";

const endpoint = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diatur.");
  const response = await fetch(`${endpoint}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Telegram sendMessage gagal.");
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    result.ok !== true ||
    !("result" in result) ||
    !result.result ||
    typeof result.result !== "object" ||
    !("message_id" in result.result) ||
    typeof result.result.message_id !== "number"
  )
    throw new Error("Respons Telegram tidak valid.");
  return result.result.message_id;
}

export async function answerTelegramCallback(callbackId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diatur.");
  const response = await fetch(`${endpoint}/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Telegram answerCallbackQuery gagal.");
}
