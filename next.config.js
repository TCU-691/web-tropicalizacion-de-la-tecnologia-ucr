
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Added for Google User Avatars
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      { // Firebase Storage - Keep for now if other parts of app might use it, or remove if fully deprecated
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      { // Added for ImageKit.io
        protocol: 'https',
        hostname: 'ik.imagekit.io', // Base ImageKit hostname
        port: '',
        pathname: '/**', // Allows any path under your ImageKit ID
      }
    ],
  },
};

module.exports = nextConfig;
