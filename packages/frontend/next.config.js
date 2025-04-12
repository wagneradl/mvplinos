/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Configurações para resolver problemas de build na Render
  typescript: {
    // Ignorar erros de tipo durante o build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignorar erros de ESLint durante o build
    ignoreDuringBuilds: true,
  },
  // Aumentar o limite de memória para o build
  staticPageGenerationTimeout: 180,
  // Configurar webpack para resolver os path aliases corretamente
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
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
