import type { NextConfig } from "next";
import { getProductionConfigErrors } from "./src/lib/config/production";

if (process.env.NODE_ENV === "production") {
  const configErrors = getProductionConfigErrors(process.env);
  if (configErrors.length > 0) {
    throw new Error(
      `Invalid production configuration: ${configErrors.join(" ")}`,
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
