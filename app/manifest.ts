import type { MetadataRoute } from "next";
import { color } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sarthak Saxena · Full-Stack Engineer",
    short_name: "sarthxen",
    description: "Portfolio of Sarthak Saxena, full-stack engineer.",
    start_url: "/",
    display: "standalone",
    background_color: color.bg,
    theme_color: color.bg,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
