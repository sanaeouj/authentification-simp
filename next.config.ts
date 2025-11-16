import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configuration pour Turbopack (utilisé par défaut dans Next.js 16)
  turbopack: {},
  // Configuration webpack pour compatibilité (utiliser --webpack pour activer)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
        poll: 1000, // Utiliser polling au lieu de file watching sur Windows
      };
    }
    return config;
  },
};

export default nextConfig;
