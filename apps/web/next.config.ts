import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  serverExternalPackages: ["@anthropic-ai/sdk", "pdf-lib"],
};

export default withSentryConfig(nextConfig, {
  org: "anygrade",
  project: "anygrade",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
