import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Ensure root "/" resolves consistently (no trailing-slash redirect issues)
  trailingSlash: false,
};

export default nextConfig;
