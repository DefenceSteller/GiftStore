import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The legacy Express server + static assets in /public remain untouched.
  // Keep the app router as the single source of truth for new pages.
};

export default nextConfig;
