import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker deployment - also helps with prerendering issues
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["*"],
    },
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },
};

export default nextConfig;
