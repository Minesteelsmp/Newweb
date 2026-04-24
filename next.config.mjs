/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // mysql2 needs to run on the Node.js runtime (not Edge)
  serverExternalPackages: ['mysql2', 'bcryptjs'],
}

export default nextConfig
