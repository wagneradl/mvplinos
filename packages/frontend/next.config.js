/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pedidos',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
