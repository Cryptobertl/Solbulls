import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local-dev Postgres) ships WASM assets that must load via
  // native require, not the server bundle. Unused in production.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
