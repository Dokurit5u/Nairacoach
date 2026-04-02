import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Set this to false if you want to fail builds on type errors (recommended for production)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Set this to false to ensure code quality before deploying
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
