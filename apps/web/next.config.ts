import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  serverExternalPackages: ["@anthropic-ai/sdk", "pdf-lib"],
};

export default nextConfig;
