import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000", // Default dev origin
        "*.app.github.dev", // Wildcard for Codespaces domains
      ],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
