import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "CorpConnect Pune — verified tech professionals", template: "%s · CorpConnect Pune" },
  description:
    "A private network for verified employees across Pune's tech parks: buy and sell electronics, get job referrals and join local tech communities.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6fcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#121c1e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
