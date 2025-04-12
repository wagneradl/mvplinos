
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Desabilitar SSG para arquivos problemáticos
  experimental: {
    serverActions: true,
    optimizeCss: false,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Aumentar timeout para geração de páginas estáticas
  staticPageGenerationTimeout: 300,
  
  // Configurar webpack
  webpack: (config) => {
    // Configuração para resolver path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Otimizar para build na nuvem
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    
    return config;
  },
  
  // Redirecionamento padrão
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
