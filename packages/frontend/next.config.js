/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');

// Verificar se os arquivos estáticos essenciais existem
const publicDir = path.join(__dirname, 'public');
const requiredFiles = ['manifest.json', 'favicon.ico', 'icon1.png'];

requiredFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[AVISO] Arquivo estático necessário não encontrado: ${file}`);
  } else {
    console.log(`[OK] Arquivo estático encontrado: ${file}`);
  }
});

const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double rendering in development
  
  // Prevent type checking during build to avoid issues on Render
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Increase timeout for builds
  staticPageGenerationTimeout: 300,
  
  // Configuração para servir arquivos estáticos corretamente
  // O Next.js já serve a pasta public na raiz por padrão
  // Esta configuração adicional é para garantir que funcione em desenvolvimento
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // Configure webpack for compatibility
  webpack: (config) => {
    // Explicitly set alias for @ to point to src
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Otimizações específicas para ambiente
    if (process.env.NODE_ENV === 'production') {
      // Optimize for production
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    } else {
      // Em desenvolvimento, garantir que os arquivos estáticos sejam servidos corretamente
      console.log('[DEV] Configurando webpack para servir arquivos estáticos em desenvolvimento');
    }
    
    // Add additional resolve extensions for TypeScript files
    config.resolve.extensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', ...config.resolve.extensions || []
    ];
    
    return config;
  },
  
  // Redirecionamento padrão para página de pedidos
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pedidos',
        permanent: true,
      },
    ];
  },
  
  // Add environment variables for build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
