import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IPL Fantasy Draft",
    short_name: "IPL Fantasy",
    description: "Private league fantasy cricket — mobile-first web app.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0f14",
    theme_color: "#0c0f14",
    orientation: "portrait-primary",
  };
}
