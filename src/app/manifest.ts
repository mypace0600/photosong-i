import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "포토송이",
    short_name: "포토송이",
    description: "목표를 사진으로 키우는 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff8f3",
    theme_color: "#6f2c83",
    orientation: "portrait",
    categories: ["productivity", "lifestyle", "photo"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
