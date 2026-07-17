import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/CJS packages used by extraction, rendering, and the ORM must not
  // be bundled by Next's server compiler.
  serverExternalPackages: ["sharp", "pdf-parse", "mammoth", "@prisma/client"],
};

export default nextConfig;
