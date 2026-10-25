import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    "*.monkeycode-ai.live",
    "*.monkeycode-ai.com",
    "localhost",
    "127.0.0.1",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "three"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
};

export default nextConfig;
