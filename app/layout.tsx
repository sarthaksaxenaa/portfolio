import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { color } from "@/lib/tokens";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { CursorLight } from "@/components/cursor/CursorLight";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Reveals } from "@/components/motion/Reveals";
import { PinnedTracks } from "@/components/motion/PinnedTracks";
import { ChapterObserver } from "@/components/motion/ChapterObserver";
import { SceneLayer } from "@/components/scene/SceneLayer";
import { motionBootScript, preloadBootScript } from "@/lib/motion";
import { Opening } from "@/components/motion/Opening";
import { Magnetic } from "@/components/motion/Magnetic";
import { Devices } from "@/components/motion/Devices";
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
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Sarthak Saxena",
  authors: [{ name: "Sarthak Saxena", url: SITE_URL }],
  creator: "Sarthak Saxena",
  keywords: ["Sarthak Saxena", "sarthxen", "full-stack engineer", "Next.js developer", "TypeScript", "AI engineer", "portfolio", "Greater Noida", "NIET"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Sarthak Saxena",
    title: "Sarthak Saxena · Full-Stack Engineer",
    description: "Real-time and AI products, built and measured. RideShare and CareNexus, live.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sarthak Saxena · Full-Stack Engineer",
    description: "Real-time and AI products, built and measured. RideShare and CareNexus, live.",
  },
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
          <Devices />
          <Opening />
        </MotionProvider>
      </body>
    </html>
  );
}
