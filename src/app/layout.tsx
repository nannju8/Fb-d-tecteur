import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault — Reels hors ligne, sous contrôle",
  description:
    "Console personnelle pour connecter une session, collecter de petits lots de vidéos et les regarder hors ligne dans un flux vertical privé.",
};

export const viewport: Viewport = {
  themeColor: "#05070c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
