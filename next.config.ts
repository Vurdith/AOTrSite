import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-d0c3b53d48004380bf4f8c053c4de0a4.r2.dev",
        pathname: "/items/**",
      },
    ],
  },
  async headers() {
    const scriptSrc = process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "img-src 'self' data: blob: https://cdn.discordapp.com https://pub-d0c3b53d48004380bf4f8c053c4de0a4.r2.dev",
          "media-src 'self'",
          "font-src 'self' data:",
          "connect-src 'self'",
          scriptSrc,
          "style-src 'self' 'unsafe-inline'",
          "worker-src 'self' blob:",
        ].join("; "),
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
    ];
    const staticAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/hero/:path*", headers: staticAssetHeaders },
      { source: "/uploads/:path*", headers: staticAssetHeaders },
      { source: "/music/:path*", headers: staticAssetHeaders },
      { source: "/noise.svg", headers: staticAssetHeaders },
      { source: "/intro-loader-v2.mp4", headers: staticAssetHeaders },
      { source: "/cathedral-scroll-smooth.mp4", headers: staticAssetHeaders },
      { source: "/ayanakoji-profile-320.webp", headers: staticAssetHeaders },
    ];
  },
};

export default nextConfig;
