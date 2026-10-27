import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  basePath,
  ...(staticExport ? { output: "export", trailingSlash: true } : {}),
  images: { unoptimized: staticExport },
};

export default nextConfig;
