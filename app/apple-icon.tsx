import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { color } from "@/lib/tokens";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const bold = await readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf"));

/** Home-screen icon for iOS and Android (the SVG favicon is not used there). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color.bg,
          color: color.text,
          fontFamily: "Geist",
          fontSize: 112,
          letterSpacing: -4,
        }}
      >
        S
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: bold, weight: 700, style: "normal" }] },
  );
}
