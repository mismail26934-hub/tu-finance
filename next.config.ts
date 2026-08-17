import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/pl-report": ["./data/**/*"],
    "/api/pl-report/upload": ["./data/**/*"],
  },
};

export default nextConfig;
