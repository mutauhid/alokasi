import { transactionTitleKey } from "@/modules/transactions/suggestions";

type CategoryOption = { id: string; name: string };
type HistoricalTransaction = {
  title: string;
  categoryId: string | null;
  transactionDate: Date;
};
type PersonalRule = { keywordKey: string; categoryId: string };

export type TelegramCategorySuggestionSource =
  "personal-rule" | "history" | "category-name" | "keyword" | "default";

type CategorySuggestion = {
  categoryId: string;
  source: TelegramCategorySuggestionSource;
};

const keywordGroups = [
  {
    categoryAliases: ["transportasi", "kendaraan", "perjalanan"],
    keywords: [
      "bensin",
      "bbm",
      "pertalite",
      "pertamax",
      "solar",
      "parkir",
      "tol",
      "ojek",
      "gojek",
      "grab",
      "taksi",
      "angkot",
      "bus",
      "kereta",
      "krl",
      "mrt",
      "transjakarta",
      "servis motor",
      "servis mobil",
    ],
  },
  {
    categoryAliases: [
      "makan minum",
      "makan dan minum",
      "makanan minuman",
      "kuliner",
    ],
    keywords: [
      "makan",
      "makanan",
      "minum",
      "minuman",
      "kopi",
      "sarapan",
      "bakso",
      "nasi",
      "restoran",
      "warung",
      "snack",
      "jajan",
    ],
  },
  {
    categoryAliases: ["tagihan", "utilitas"],
    keywords: [
      "tagihan",
      "listrik",
      "pln",
      "pdam",
      "internet",
      "wifi",
      "pulsa",
      "paket data",
      "telepon",
      "bpjs",
      "cicilan",
      "iuran",
      "langganan",
      "netflix",
      "spotify",
    ],
  },
  {
    categoryAliases: ["belanja", "kebutuhan"],
    keywords: [
      "belanja bulanan",
      "pakaian",
      "baju",
      "celana",
      "sepatu",
      "tas",
      "kosmetik",
      "skincare",
      "perabot",
      "supermarket",
      "minimarket",
      "sembako",
      "kebutuhan rumah",
    ],
  },
  {
    categoryAliases: ["kesehatan", "medis"],
    keywords: [
      "obat",
      "dokter",
      "klinik",
      "rumah sakit",
      "apotek",
      "vitamin",
      "laboratorium",
      "medical checkup",
      "kacamata",
    ],
  },
] as const;

const builtInCategoryAliases = new Set<string>(
  keywordGroups.flatMap((group) => [...group.categoryAliases]),
);

function searchable(value: string) {
  return transactionTitleKey(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function containsPhrase(text: string, phrase: string) {
  return ` ${text} `.includes(` ${phrase} `);
}

function suggestionFromHistory(
  title: string,
  categories: CategoryOption[],
  history: HistoricalTransaction[],
) {
  const activeIds = new Set(categories.map((category) => category.id));
  const titleKey = transactionTitleKey(title);
  const groups = new Map<
    string,
    { categoryId: string; count: number; lastUsedAt: number }
  >();
  for (const transaction of history) {
    if (
      !transaction.categoryId ||
      !activeIds.has(transaction.categoryId) ||
      transactionTitleKey(transaction.title) !== titleKey
    )
      continue;
    const current = groups.get(transaction.categoryId);
    const usedAt = transaction.transactionDate.valueOf();
    if (current) {
      current.count += 1;
      current.lastUsedAt = Math.max(current.lastUsedAt, usedAt);
    } else {
      groups.set(transaction.categoryId, {
        categoryId: transaction.categoryId,
        count: 1,
        lastUsedAt: usedAt,
      });
    }
  }
  return [...groups.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.lastUsedAt - left.lastUsedAt ||
      left.categoryId.localeCompare(right.categoryId),
  )[0]?.categoryId;
}

export function suggestTelegramExpenseCategory({
  title,
  categories,
  history,
  personalRules = [],
  defaultCategoryId,
}: {
  title: string;
  categories: CategoryOption[];
  history: HistoricalTransaction[];
  personalRules?: PersonalRule[];
  defaultCategoryId: string;
}): CategorySuggestion {
  const normalizedTitle = searchable(title);
  const activeIds = new Set(categories.map((category) => category.id));
  const personalRule = personalRules
    .filter(
      (rule) =>
        activeIds.has(rule.categoryId) &&
        containsPhrase(normalizedTitle, searchable(rule.keywordKey)),
    )
    .sort(
      (left, right) =>
        searchable(right.keywordKey).length -
          searchable(left.keywordKey).length ||
        left.keywordKey.localeCompare(right.keywordKey, "id-ID"),
    )[0];
  if (personalRule)
    return { categoryId: personalRule.categoryId, source: "personal-rule" };

  const historicalCategoryId = suggestionFromHistory(
    title,
    categories,
    history,
  );
  if (historicalCategoryId)
    return { categoryId: historicalCategoryId, source: "history" };

  const categoryNameMatches = categories.filter((category) => {
    const name = searchable(category.name);
    return (
      name.length >= 3 &&
      !builtInCategoryAliases.has(name) &&
      containsPhrase(normalizedTitle, name)
    );
  });
  if (categoryNameMatches.length === 1)
    return {
      categoryId: categoryNameMatches[0].id,
      source: "category-name",
    };

  const scored = keywordGroups
    .map((group) => {
      const matchingCategories = categories.filter((category) =>
        group.categoryAliases.some(
          (alias) => alias === searchable(category.name),
        ),
      );
      const score = group.keywords.filter((keyword) =>
        containsPhrase(normalizedTitle, searchable(keyword)),
      ).length;
      return matchingCategories.length === 1 && score
        ? { categoryId: matchingCategories[0].id, score }
        : null;
    })
    .filter((item): item is { categoryId: string; score: number } =>
      Boolean(item),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.categoryId.localeCompare(right.categoryId),
    );
  if (scored[0] && (!scored[1] || scored[0].score > scored[1].score))
    return { categoryId: scored[0].categoryId, source: "keyword" };

  return { categoryId: defaultCategoryId, source: "default" };
}
