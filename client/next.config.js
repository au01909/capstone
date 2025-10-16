/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  // Enable accessibility features
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize for accessibility
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

module.exports = nextConfig
