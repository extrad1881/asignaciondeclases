/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    localPatterns: [
      { pathname: "/logos/**", search: "" },
      { pathname: "/schedule-assets/**", search: "" }
    ],
    qualities: [75]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
