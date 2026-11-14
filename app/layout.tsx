import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { color } from "@/lib/tokens";
import { SITE_URL } from "@/lib/site";
import { CursorLight } from "@/components/cursor/CursorLight";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Reveals } from "@/components/motion/Reveals";
import { PinnedTracks } from "@/components/motion/PinnedTracks";
import { ChapterObserver } from "@/components/motion/ChapterObserver";
import { SceneLayer } from "@/components/scene/SceneLayer";
import { motionBootScript, preloadBootScript } from "@/lib/motion";
import { Preloader } from "@/components/motion/Preloader";
import { Magnetic } from "@/components/motion/Magnetic";
import "./globals.css";

const instrumentSerif = localFont({
  src: "./fonts/InstrumentSerif-Italic.woff2",
  style: "italic",
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sarthak Saxena — Engineer",
  description:
    "Sarthak Saxena: full-stack engineer building measured, real-time and AI products.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Sarthak Saxena",
    title: "Sarthak Saxena — Engineer",
    description: "Sure enough to burn the ships. Real-time and AI products, measured.",
  },
  twitter: { card: "summary_large_image" },
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
      // data-motion is set by the boot script before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: preloadBootScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <MotionProvider>
          <SceneLayer />
          {children}
          <CursorLight />
          <SmoothScroll />
          <Reveals />
          <PinnedTracks />
          <ChapterObserver />
          <Magnetic />
          <Preloader />
        </MotionProvider>
      </body>
    </html>
  );
}
