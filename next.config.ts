import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function getAllowedDevOrigins() {
  const defaults = ["localhost", "127.0.0.1", "::1"];
  const envHosts = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const interfaceHosts = Object.values(networkInterfaces())
    .flat()
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => entry.address.split("%")[0])
    .filter(Boolean);

  return [...new Set([...defaults, ...envHosts, ...interfaceHosts])];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.NODE_ENV === "development" ? getAllowedDevOrigins() : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
