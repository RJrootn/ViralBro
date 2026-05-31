/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: '**.licdn.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
  // Allow large AI responses
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bullmq'],
  },
};

module.exports = nextConfig;
