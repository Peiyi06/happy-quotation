import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/internal-travel-library-media": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};
export default nextConfig;
