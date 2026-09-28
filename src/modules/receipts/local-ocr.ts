export type ReceiptEvidenceKind = "transfer" | "qris" | "receipt" | "unknown";

export type LocalReceiptExtraction = {
  amount: string;
  transactionDate: string;
  merchant: string;
  note: string;
  institution: string;
  evidenceKind: ReceiptEvidenceKind;
  paymentRail: string;
  confidence: {
    ocr: number;
    amount: number | null;
    date: number | null;
    merchant: number | null;
    institution: number | null;
  };
};

const institutionMatchers: Array<{
  name: string;
  branded: RegExp;
  generic?: RegExp;
}> = [
  {
    name: "Bank Mandiri",
    branded: /\blivin(?:'|’)?\b|mandiri online/iu,
    generic: /\bbank mandiri\b|\bmandiri\b/iu,
  },
  {
    name: "BCA",
    branded:
      /\bmybca\b|\bbca mobile\b|\bklikbca\b|\bpt\.?\s+bank central asia(?:\s+tbk)?\b|(?:^|\n)\s*bca\s*(?:\n|$)/imu,
    generic: /\bbank central asia\b|\bbca\b/iu,
  },
  {
    name: "BRI",
    branded: /\bbrimo\b|\bbri mobile\b/iu,
    generic: /\bbank rakyat indonesia\b|\bbri\b/iu,
  },
  {
    name: "BNI",
    branded: /\bwondr\b|\bbni mobile\b/iu,
    generic: /\bbank negara indonesia\b|\bbni\b/iu,
  },
  {
    name: "BSI",
    branded: /\bbyond\b|\bbsi mobile\b/iu,
    generic: /\bbank syariah indonesia\b|\bbsi\b/iu,
  },
  {
    name: "CIMB Niaga",
    branded: /\bocto mobile\b|\bocto clicks\b/iu,
    generic: /\bcimb niaga\b|\bcimb\b/iu,
  },
  {
    name: "Bank Jago",
    branded: /\bjago app\b/iu,
    generic: /\bbank jago\b/iu,
  },
  {
    name: "Bank Permata",
    branded: /\bpermatame\b/iu,
    generic: /\bbank permata\b|\bpermata bank\b/iu,
  },
  {
    name: "Bank Danamon",
    branded: /\bd-bank pro\b/iu,
    generic: /\bbank danamon\b|\bdanamon\b/iu,
  },
  {
    name: "BTN",
    branded: /\bbale by btn\b|\bbale\b/iu,
    generic: /\bbank tabungan negara\b|\bbtn\b/iu,
  },
  { name: "SeaBank", branded: /\bseabank\b/iu },
  { name: "blu by BCA Digital", branded: /\bblu by bca\b|\bblu\b/iu },
  {
    name: "Bank Neo Commerce",
    branded: /\bneobank\b/iu,
    generic: /\bbank neo commerce\b/iu,
  },
  {
    name: "Bank Mega",
    branded: /\bm-smile\b/iu,
    generic: /\bbank mega\b/iu,
  },
  {
    name: "OCBC",
    branded: /\bocbc mobile\b/iu,
    generic: /\bocbc(?: nisp)?\b/iu,
  },
  {
    name: "Maybank",
    branded: /\bm2u\b/iu,
    generic: /\bmaybank\b/iu,
  },
  {
    name: "Bank Muamalat",
    branded: /\bmdin\b/iu,
    generic: /\bbank muamalat\b|\bmuamalat\b/iu,
  },
  { name: "GoPay", branded: /\bgopay\b|\bgojek\b/iu },
  {
    name: "DANA",
    branded:
      /(?:^|\n)\s*dana\s*(?:\n|$)|\bdana indonesia\b|\bdompet digital dana\b|\bsaldo dana\b/imu,
  },
  { name: "OVO", branded: /\bovo\b/iu },
  { name: "ShopeePay", branded: /\bshopeepay\b|\bshopee pay\b/iu },
  { name: "LinkAja", branded: /\blinkaja\b|\blink aja\b/iu },
];

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanLine(value: string) {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function parseRupiah(value: string) {
  const normalized = value
    .replace(/[Oo]/gu, "0")
    .replace(/\s+/gu, "")
    .replace(/[^0-9.,]/gu, "");
  const lastDot = normalized.lastIndexOf(".");
  const lastComma = normalized.lastIndexOf(",");
  const lastSeparator = Math.max(lastDot, lastComma);
  const trailingDigits =
    lastSeparator >= 0 ? normalized.length - lastSeparator - 1 : 0;
  const hasBothSeparators = lastDot >= 0 && lastComma >= 0;
  const separator = lastSeparator >= 0 ? normalized[lastSeparator] : "";
  const occurrences = separator ? normalized.split(separator).length - 1 : 0;
  const hasDecimalSuffix =
    trailingDigits === 2 &&
    (hasBothSeparators || occurrences === 1) &&
    normalized.slice(0, lastSeparator).replace(/\D/gu, "").length >= 1;
  const integerPart = hasDecimalSuffix
    ? normalized.slice(0, lastSeparator)
    : normalized;
  const digits = integerPart.replace(/\D/gu, "");
  if (!digits || digits.length > 18) return null;
  const amount = BigInt(digits);
  return amount > 0n && amount <= 9223372036854775807n ? amount : null;
}

function extractAmount(lines: string[], baseConfidence: number) {
  const candidates: Array<{ amount: bigint; score: number }> = [];
  const labels: Array<[RegExp, number]> = [
    [/\btotal transaksi\b/iu, 100],
    [/\bgrand total\b/iu, 98],
    [/\btotal (?:pembayaran|bayar|payment)\b/iu, 95],
    [/\bjumlah (?:pembayaran|bayar)\b/iu, 92],
    [/\bnominal (?:transaksi|transfer|pembayaran)\b/iu, 84],
    [/\btotal\b/iu, 72],
  ];
  for (const line of lines) {
    const match = line.match(/(?:rp\.?|idr)\s*([0-9Oo][0-9Oo.,\s]{1,24})/iu);
    if (!match) continue;
    const amount = parseRupiah(match[1]);
    if (!amount) continue;
    let score = 45;
    for (const [label, labelScore] of labels) {
      if (label.test(line)) score = Math.max(score, labelScore);
    }
    if (/\bbiaya|\bfee|\badmin/iu.test(line)) score -= 40;
    candidates.push({ amount, score });
  }
  candidates.sort((a, b) => b.score - a.score || Number(b.amount - a.amount));
  const best = candidates[0];
  return best
    ? {
        value: best.amount.toString(),
        confidence: clampConfidence(baseConfidence * 0.65 + best.score * 0.35),
      }
    : { value: "", confidence: null };
}

const months: Record<string, string> = {
  jan: "01",
  januari: "01",
  january: "01",
  feb: "02",
  februari: "02",
  february: "02",
  mar: "03",
  maret: "03",
  march: "03",
  apr: "04",
  april: "04",
  mei: "05",
  may: "05",
  jun: "06",
  juni: "06",
  june: "06",
  jul: "07",
  juli: "07",
  july: "07",
  agu: "08",
  agt: "08",
  agustus: "08",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  okt: "10",
  oktober: "10",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  des: "12",
  desember: "12",
  dec: "12",
  december: "12",
};

function validDate(year: string, month: string, day: string) {
  const value = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    ? value
    : "";
}

function extractDate(text: string, baseConfidence: number) {
  const numeric = text.match(/\b([0-3]?\d)[\s/.-]([01]?\d)[\s/.-](20\d{2})\b/u);
  if (numeric) {
    return {
      value: validDate(numeric[3], numeric[2], numeric[1]),
      confidence: clampConfidence(baseConfidence * 0.8 + 16),
    };
  }
  const named = text.match(
    /\b([0-3]?\d)\s+(jan(?:uari|uary)?|feb(?:ruari|ruary)?|mar(?:et|ch)?|apr(?:il)?|mei|may|jun(?:i|e)?|jul(?:i|y)?|agu(?:stus)?|agt|aug(?:ust)?|sep(?:t(?:ember)?)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|des(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/iu,
  );
  if (!named) return { value: "", confidence: null };
  const month = months[named[2].toLocaleLowerCase("id-ID")];
  return {
    value: month ? validDate(named[3], month, named[1]) : "",
    confidence: month ? clampConfidence(baseConfidence * 0.8 + 14) : null,
  };
}

function extractMerchant(lines: string[], baseConfidence: number) {
  const label =
    /^(?:nama\s+)?(?:merchant|penerima|tujuan transaksi|penerima transfer)\s*:?\s*(.*)$/iu;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(label);
    if (!match) continue;
    const value = cleanLine(match[1] || lines[index + 1] || "");
    if (value && !isReceiptLabel(value)) {
      return {
        value: value.slice(0, 200),
        confidence: clampConfidence(baseConfidence * 0.7 + 22),
      };
    }
  }
  const uppercaseName = lines.find(
    (line) =>
      line.length >= 5 &&
      line.length <= 100 &&
      /^[A-Z][A-Z .'-]+$/u.test(line) &&
      line.trim().split(/\s+/u).length >= 2 &&
      !isReceiptLabel(line),
  );
  if (uppercaseName) {
    return {
      value: uppercaseName.slice(0, 200),
      confidence: clampConfidence(baseConfidence * 0.65 + 12),
    };
  }
  return { value: "", confidence: null };
}

function isReceiptLabel(value: string) {
  return /^(?:bank|rekening|nomor|no\.?|rp\.?|idr|nama penerima|bank tujuan|no\.? rekening tujuan|dari rekening|nominal|biaya|layanan transfer|berita|tujuan transaksi|jenis transaksi|metode transfer|detail transaksi|transfer berhasil|total transaksi)\b/iu.test(
    value,
  );
}

function detectInstitution(
  text: string,
  lines: string[],
  baseConfidence: number,
) {
  const matches = institutionMatchers.flatMap((item, order) => {
    const branded = item.branded.test(text);
    const generic = item.generic?.test(text) ?? false;
    if (!branded && !generic) return [];
    const firstLine = lines.findIndex(
      (line) => item.branded.test(line) || (item.generic?.test(line) ?? false),
    );
    const line = firstLine >= 0 ? lines[firstLine] : "";
    const precedingContext =
      firstLine >= 0
        ? lines.slice(Math.max(0, firstLine - 2), firstLine + 1).join(" ")
        : "";
    const headerScore =
      firstLine >= 0 && firstLine < 7 ? Math.max(0, 50 - firstLine * 8) : 0;
    const destinationPenalty =
      /bank tujuan|rekening tujuan|bank penerima|penerima|jenis transaksi|transfer ke/iu.test(
        precedingContext || line,
      )
        ? 55
        : 0;
    return [
      {
        name: item.name,
        score:
          (branded ? 100 : 55) + headerScore - destinationPenalty - order / 100,
      },
    ];
  });
  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];
  return best
    ? {
        value: best.name,
        confidence: clampConfidence(
          baseConfidence * 0.55 + Math.min(best.score, 100) * 0.45,
        ),
      }
    : { value: "", confidence: null };
}

function evidence(text: string): {
  kind: ReceiptEvidenceKind;
  rail: string;
} {
  if (/\bqris\b|quick response code indonesian standard/iu.test(text)) {
    return { kind: "qris", rail: "QRIS" };
  }
  if (
    /\btransfer\b|\bbi[\s-]?fast\b|rekening (?:tujuan|penerima)|bukti transfer/iu.test(
      text,
    )
  ) {
    if (/\bbi[\s-]?fast\b/iu.test(text))
      return { kind: "transfer", rail: "BI-FAST" };
    if (/\brtgs\b/iu.test(text)) return { kind: "transfer", rail: "RTGS" };
    if (/\bskn\b/iu.test(text)) return { kind: "transfer", rail: "SKN" };
    return { kind: "transfer", rail: "Transfer bank" };
  }
  if (/\bstruk\b|\breceipt\b|\bkasir\b|\bkembalian\b|\btotal\b/iu.test(text)) {
    return { kind: "receipt", rail: "" };
  }
  return { kind: "unknown", rail: "" };
}

export function parseLocalReceiptOcr(
  rawText: string,
  rawConfidence: number,
): LocalReceiptExtraction {
  const text = rawText.normalize("NFC").slice(0, 50_000);
  const lines = text.split(/\r?\n/u).map(cleanLine).filter(Boolean);
  const ocrConfidence = clampConfidence(rawConfidence);
  const amount = extractAmount(lines, ocrConfidence);
  const date = extractDate(text, ocrConfidence);
  const merchant = extractMerchant(lines, ocrConfidence);
  const institution = detectInstitution(text, lines, ocrConfidence);
  const detectedEvidence = evidence(text);
  const noteParts = [
    detectedEvidence.kind === "qris"
      ? "Pembayaran QRIS"
      : detectedEvidence.kind === "transfer"
        ? "Transfer"
        : "",
    institution.value ? `via ${institution.value}` : "",
    detectedEvidence.rail && detectedEvidence.rail !== "QRIS"
      ? `(${detectedEvidence.rail})`
      : "",
  ].filter(Boolean);

  return {
    amount: amount.value,
    transactionDate: date.value,
    merchant: merchant.value,
    note: noteParts.join(" ").slice(0, 1000),
    institution: institution.value,
    evidenceKind: detectedEvidence.kind,
    paymentRail: detectedEvidence.rail,
    confidence: {
      ocr: ocrConfidence,
      amount: amount.confidence,
      date: date.confidence,
      merchant: merchant.confidence,
      institution: institution.confidence,
    },
  };
}
