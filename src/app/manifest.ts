import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Alokasi — Ruang untuk rencana",
    short_name: "Alokasi",
    description:
      "Kelola keuangan pribadi dan bersama, satu rencana pada satu waktu.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#176b56",
    lang: "id",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/alokasi-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/alokasi-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/alokasi-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
