import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Local dev proxy: `NEXT_PUBLIC_API_BASE_URL` is absolute in
  // .env.development, but any relative `/api/v1/*` call (tests, fallback)
  // is forwarded to Laravel on :8000 so login/register never 404 on :3000.
  // NOTE: `output: "export"` ignores rewrites at build time — this only
  // applies to `next dev` (localhost:3000).
  async rewrites() {
    const laravel = process.env.LARAVEL_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${laravel}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
