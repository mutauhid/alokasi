import {
  ArrowLeftRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Heart,
  HeartPulse,
  House,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

type TransactionType = "income" | "expense" | "transfer";

const categoryPatterns = [
  {
    pattern: /^(makan|makanan|minum|minuman|kuliner|kopi|kafe|cafe|restoran)/u,
    icon: UtensilsCrossed,
    tone: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
  },
  {
    pattern: /^(belanja|shopping|sembako)/u,
    icon: ShoppingBag,
    tone: "text-violet-700 dark:text-violet-300 bg-violet-500/10",
  },
  {
    pattern: /^(transportasi|transport|kendaraan|bensin|parkir|ojek)/u,
    icon: CarFront,
    tone: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
  },
  {
    pattern: /^(tagihan|listrik|air|internet|pulsa|langganan)/u,
    icon: ReceiptText,
    tone: "text-orange-700 dark:text-orange-300 bg-orange-500/10",
  },
  {
    pattern: /^(kesehatan|obat|dokter|medis)/u,
    icon: HeartPulse,
    tone: "text-rose-700 dark:text-rose-300 bg-rose-500/10",
  },
  {
    pattern: /^(gaji|upah|salary)/u,
    icon: BriefcaseBusiness,
    tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
  },
  {
    pattern: /^(pendapatan|pemasukan|penghasilan|bonus)/u,
    icon: Wallet,
    tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
  },
  {
    pattern: /^(refund|pengembalian|cashback)/u,
    icon: RotateCcw,
    tone: "text-teal-700 dark:text-teal-300 bg-teal-500/10",
  },
  {
    pattern: /^(tarik tunai|tunai|cash)/u,
    icon: Banknote,
    tone: "text-teal-700 dark:text-teal-300 bg-teal-500/10",
  },
  {
    pattern: /^(dating|pasangan|kencan)/u,
    icon: Heart,
    tone: "text-pink-700 dark:text-pink-300 bg-pink-500/10",
  },
  {
    pattern: /^(pendidikan|sekolah|kuliah|kursus)/u,
    icon: GraduationCap,
    tone: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
  },
  {
    pattern: /^(hiburan|film|bioskop|rekreasi)/u,
    icon: Clapperboard,
    tone: "text-purple-700 dark:text-purple-300 bg-purple-500/10",
  },
  {
    pattern: /^(rumah|hunian|sewa)/u,
    icon: House,
    tone: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10",
  },
  {
    pattern: /^(investasi|saham|reksa dana)/u,
    icon: TrendingUp,
    tone: "text-blue-700 dark:text-blue-300 bg-blue-500/10",
  },
  {
    pattern: /^(tabungan|menabung)/u,
    icon: PiggyBank,
    tone: "text-green-700 dark:text-green-300 bg-green-500/10",
  },
  {
    pattern: /^(donasi|amal|sedekah)/u,
    icon: HandHeart,
    tone: "text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/10",
  },
] as const;

export function categoryIconDetails(
  categoryName: string | null,
  type: TransactionType,
) {
  if (type === "transfer") {
    return {
      icon: ArrowLeftRight,
      tone: "bg-secondary text-primary",
      label: "Transfer",
    };
  }
  const name = categoryName?.trim().toLocaleLowerCase("id-ID") ?? "";
  const match = categoryPatterns.find(({ pattern }) => pattern.test(name));
  return {
    icon: match?.icon ?? Tag,
    tone: match?.tone ?? "bg-secondary text-primary",
    label: categoryName ?? "Tanpa kategori",
  };
}

export function TransactionCategoryIcon({
  categoryName,
  type,
  className = "size-10 rounded-xl",
}: {
  categoryName: string | null;
  type: TransactionType;
  className?: string;
}) {
  const { icon: Icon, tone, label } = categoryIconDetails(categoryName, type);
  return (
    <span
      role="img"
      aria-label={`Ikon kategori ${label}`}
      className={`flex shrink-0 items-center justify-center ${className} ${tone}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
