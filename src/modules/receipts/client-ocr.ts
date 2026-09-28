"use client";

import {
  parseLocalReceiptOcr,
  type LocalReceiptExtraction,
} from "@/modules/receipts/local-ocr";

export type OcrProgress = { label: string; percent: number };

async function preprocessReceipt(file: File) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(2, 2200 / Math.max(bitmap.width, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("OCR_CANVAS_UNAVAILABLE");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const pixels = context.getImageData(0, 0, width, height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray =
      pixels.data[index] * 0.299 +
      pixels.data[index + 1] * 0.587 +
      pixels.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("OCR_IMAGE_FAILED"))),
      "image/png",
    );
  });
}

function progressLabel(status: string) {
  if (status.includes("loading tesseract core")) return "Menyiapkan mesin OCR";
  if (status.includes("loading language")) return "Memuat model teks lokal";
  if (status.includes("initializing")) return "Menyiapkan pembaca teks";
  if (status.includes("recognizing")) return "Membaca bukti pembayaran";
  return "Memproses gambar";
}

export async function recognizeReceiptLocally(
  file: File,
  onProgress: (progress: OcrProgress) => void,
): Promise<LocalReceiptExtraction> {
  const prepared = await preprocessReceipt(file);
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js",
    langPath: "/ocr",
    corePath: "/ocr",
    logger(message) {
      onProgress({
        label: progressLabel(message.status),
        percent: Math.round((message.progress ?? 0) * 100),
      });
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(prepared);
    return parseLocalReceiptOcr(result.data.text, result.data.confidence);
  } finally {
    await worker.terminate();
  }
}
