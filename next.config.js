// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "bcryptjs",
      "nodemailer",   // FIX: must be here or Next.js bundles it and crashes
    ],
  },
};
