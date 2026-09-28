import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Alokasi — Ruang untuk rencana", template: "%s | Alokasi" },
  description:
    "Kelola keuangan pribadi dan bersama, satu rencana pada satu waktu.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
