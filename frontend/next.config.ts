import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Development-only proxy. Production is built into Laravel's public folder,
  // so relative /api/v1 requests stay on the deployed single origin.
  async rewrites() {
    const laravel =
      process.env.LARAVEL_URL ||
      process.env.NEXT_PUBLIC_API_ORIGIN ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : null);

    if (!laravel) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${laravel}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
