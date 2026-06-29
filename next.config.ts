import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Specify the turbopack root to prevent scanning parent workspace directories
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Raise body size limit so large APK/IPA uploads work via server actions
      bodySizeLimit: "200mb",
    },
    // Enable package optimization for lucide-react and recharts to reduce bundle sizes
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  compiler: {
    // Strip console statements in production to reduce bundle size and run faster
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/index.html",
      },
    ];
  },
};

export default nextConfig;
