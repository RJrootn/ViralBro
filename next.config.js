/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: '**.licdn.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' }, // AWS S3 media uploads (Studio)
    ],
  },
  // Allow large AI responses
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bullmq'],
  },
};

module.exports = nextConfig;
