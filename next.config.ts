import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Skip TS type check ใน build (เพื่อหลบ out-of-memory บน Windows)
  // ตรวจ type ผ่าน editor/diagnostics ตามปกติแทน
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
