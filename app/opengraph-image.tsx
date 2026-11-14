import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile } from "@/content/profile";
import { color } from "@/lib/tokens";

export const alt = "Sarthak Saxena: Sure enough to burn the ships.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read at module scope so the image is rendered once at build time, not on every request.
const fontDir = join(process.cwd(), "node_modules/geist/dist/fonts");
const [bold, mono] = await Promise.all([
  readFile(join(fontDir, "geist-sans/Geist-Bold.ttf")),
  readFile(join(fontDir, "geist-mono/GeistMono-Regular.ttf")),
]);

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: color.bg,
          color: color.text,
          fontFamily: "Geist",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 22, color: color.muted, letterSpacing: 2 }}>
          00 / WARM-UP
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 132, lineHeight: 0.9, letterSpacing: -5 }}>Sarthak</div>
          <div style={{ fontSize: 132, lineHeight: 0.9, letterSpacing: -5 }}>Saxena</div>
          <div style={{ fontSize: 36, marginTop: 28, color: color.muted }}>{profile.tagline}</div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Geist Mono",
            fontSize: 22,
            color: color.muted,
          }}
        >
          <span>{profile.role} · real-time and AI products</span>
          <span>sarthxen.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
