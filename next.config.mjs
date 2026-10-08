import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Modo demo: sin credenciales de Firebase, los SDK de cliente se sustituyen por
 * implementaciones locales (lib/demo/*) con datos de ejemplo en localStorage.
 */
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  webpack(config) {
    if (DEMO_MODE) {
      const demo = (file) => path.join(dirname, "lib", "demo", file);
      config.resolve.alias = {
        ...config.resolve.alias,
        "firebase/app$": demo("app.ts"),
        "firebase/auth$": demo("auth.ts"),
        "firebase/firestore$": demo("firestore.ts"),
        "firebase/storage$": demo("storage.ts"),
      };
    }
    return config;
  },
};

export default nextConfig;
