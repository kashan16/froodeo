import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fstapzqehxlffsgekcrp.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/images/**",
      },
    ],
  },

  allowedDevOrigins: ["192.168.1.108"],
};

export default nextConfig;