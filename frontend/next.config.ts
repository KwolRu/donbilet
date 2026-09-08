import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** Адрес gateway для dev-режима. В проде /api проксирует Traefik. */
const gatewayUrl = process.env.GATEWAY_PROXY_URL || "http://localhost:5200";

const nextConfig: NextConfig = {
  // standalone — минимальный рантайм для docker-образа (frontend/Dockerfile).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  // Локальные хосты, с которых разрешён dev-доступ (кроме localhost).
  allowedDevOrigins: ["donbilet.ru"],
  images: {
    // Внешние источники картинок. S3-хост проекта добавьте сюда,
    // иначе next/image отдаст 400 на аватарах и вложениях.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
