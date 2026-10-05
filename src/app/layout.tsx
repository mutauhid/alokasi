import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Alokasi — Ruang untuk rencana", template: "%s | Alokasi" },
  description:
    "Kelola keuangan pribadi dan bersama, satu rencana pada satu waktu.",
  applicationName: "Alokasi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Alokasi",
    statusBarStyle: "default",
  },
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    apple: "/icons/alokasi-apple-180.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#176b56" },
    { media: "(prefers-color-scheme: dark)", color: "#131b20" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
