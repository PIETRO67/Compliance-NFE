import type { NextConfig } from "next";
const config: NextConfig = {
  output:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_MODE === "operational"
        ? "standalone"
        : "export"
      : undefined,
  distDir:
    process.env.NEXT_PUBLIC_APP_MODE === "operational"
      ? process.env.NODE_ENV === "production"
        ? ".next-operational"
        : ".next-operational-dev"
      : process.env.NODE_ENV === "production"
        ? ".next"
        : ".next-dev",
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  images: { unoptimized: true },
  rewrites:
    process.env.NEXT_PUBLIC_APP_MODE === "operational"
      ? async () => [
          {
            source: "/api/:path*",
            destination:
              (process.env.API_INTERNAL_URL || "http://127.0.0.1:8000") +
              "/api/:path*",
          },
        ]
      : undefined,
};
export default config;
