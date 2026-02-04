import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack (Next.js 16 default)
  turbopack: {
    // Empty config to acknowledge Turbopack is being used
  },

  // Server external packages - fs is already external in Node.js runtime
  serverExternalPackages: ['fs', 'path'],

  // Image optimization
  images: {
    unoptimized: true, // Skip image optimization for training images
  },

  // Output configuration for production
  output: 'standalone',
};

export default nextConfig;
