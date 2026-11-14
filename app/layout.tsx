import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { color } from "@/lib/tokens";
import "./globals.css";

const instrumentSerif = localFont({
  src: "./fonts/InstrumentSerif-Italic.woff2",
  style: "italic",
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sarthak Saxena — Engineer",
  description:
    "Sarthak Saxena: full-stack engineer building measured, real-time and AI products.",
};

export const viewport: Viewport = {
  themeColor: color.bg,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
