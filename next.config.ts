import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents removed: incompatible with export const dynamic = 'force-dynamic' on admin routes
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "esgdlmvvjrduazdraewq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
