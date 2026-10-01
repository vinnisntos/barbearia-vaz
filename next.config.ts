import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone: servidor mínimo usado pela imagem Docker.
  output: "standalone",
};

export default nextConfig;
