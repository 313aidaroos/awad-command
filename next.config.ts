import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
