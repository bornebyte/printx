import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The unified API route imports the backend workspace from the monorepo root.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
