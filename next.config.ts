import type { NextConfig } from "next";
const ANALYZER_BASE_URL = process.env.ANALYZER_BASE_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/analyze-backend/:path*',
        destination: `${ANALYZER_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
