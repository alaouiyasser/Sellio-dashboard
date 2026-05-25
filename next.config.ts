import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://sellio-production-ccf6.up.railway.app/api/:path*',
      },
      {
        source: '/webhook/:path*',
        destination: 'https://sellio-production-ccf6.up.railway.app/webhook/:path*',
      },
    ]
  },
};

export default nextConfig;
