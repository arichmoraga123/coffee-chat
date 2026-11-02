import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma on the Node runtime — bundling can resolve the edge/wasm client,
  // which only accepts prisma:// / prisma+postgres:// and breaks normal postgresql:// URLs.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Strong example resumes the reviewer reads at runtime (optional; loaded only if present).
  outputFileTracingIncludes: { "/api/resume/review": ["./content/resume-exemplars/**/*"] },
};

export default nextConfig;
