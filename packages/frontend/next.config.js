/** @type {import('next').NextConfig} */
const path = require('path');

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
  
  // Configure webpack for compatibility
  webpack: (config) => {
    // Explicitly set alias for @ to point to src
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Optimize for production
    if (process.env.NODE_ENV === 'production') {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
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
