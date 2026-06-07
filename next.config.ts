import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {},
  devIndicators: false,
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
