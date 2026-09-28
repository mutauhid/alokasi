export const navigation = [
  {
    slug: "dashboard",
    label: "Dashboard",
    description: "Lebih kenal uangmu. Lebih tenang menjalani hari.",
    icon: "dashboard",
  },
  {
    slug: "transactions",
    label: "Transaksi",
    description: "Setiap pengeluaran punya cerita.",
    icon: "transactions",
  },
  {
    slug: "budgets",
    label: "Budget",
    description: "Beri setiap rencana ruang dalam anggaranmu.",
    icon: "budgets",
  },
  {
    slug: "accounts",
    label: "Akun",
    description: "Semua sumber dana, dalam satu pandangan.",
    icon: "accounts",
  },
  {
    slug: "reports",
    label: "Laporan",
    description: "Lihat ke mana uangmu pergi.",
    icon: "reports",
  },
  {
    slug: "members",
    label: "Anggota & akses",
    description: "Keuangan bersama, dengan akses yang jelas.",
    icon: "members",
  },
  {
    slug: "settings",
    label: "Pengaturan",
    description: "Atur ruang keuangan sesuai kebutuhanmu.",
    icon: "settings",
  },
] as const;

export type Section = (typeof navigation)[number]["slug"];
export type WorkspaceSummary = {
  id: string;
  name: string;
  type: "personal" | "shared";
  role: "owner" | "editor" | "viewer";
};

export function sectionHref(section: Section, workspaceId?: string) {
  return `/${section}${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`;
}
