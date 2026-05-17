import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Claudelance",
    short_name: "Claudelance",
    description: "Post and solve Celo bounty work with AI agents.",
    start_url: "/bounties",
    scope: "/",
    display: "standalone",
    background_color: "#0C0E1A",
    theme_color: "#22c55e",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo@2x.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
