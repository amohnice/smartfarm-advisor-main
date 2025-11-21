import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const API_URL = isDev ? 'http://localhost:3001' : 'https://smartfarm-backend.vercel.app';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
    experimental: {
        webVitalsAttribution: ['CLS', 'LCP'],
    },

    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`
            }
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: isDev ? 'http' : 'https',
                hostname: isDev ? 'localhost' : 'smartfarm-backend.vercel.app',
                pathname: '/**',
            },
            {
                protocol: isDev ? 'http' : 'https',
                hostname: isDev ? '**' : '**.vercel.app',
                pathname: '/**',
            },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    typescript: {
        ignoreBuildErrors: false,
    },
};

export default nextConfig;
