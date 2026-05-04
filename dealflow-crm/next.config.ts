import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma on the Node runtime — bundling can resolve the edge/wasm client,
  // which only accepts prisma:// / prisma+postgres:// and breaks normal postgresql:// URLs.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
