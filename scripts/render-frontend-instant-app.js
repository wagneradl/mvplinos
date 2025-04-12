/**
 * Script para criar um app Next.js mínimo para garantir o deploy
 * Estratégia mais extrema quando tudo mais falha
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

try {
  logSection('CRIANDO APP NEXT.JS MÍNIMO PARA DEPLOY');
  
  // Navegar para o diretório do frontend
  process.chdir(path.join(process.cwd(), 'packages', 'frontend'));
  console.log('Diretório atual: ' + process.cwd());
  
  // Instalar dependências mínimas
  logSection('Instalando dependências mínimas');
  try {
    execSync('yarn add next@latest react@latest react-dom@latest', { stdio: 'inherit' });
    console.log('Dependências instaladas com sucesso');
  } catch (error) {
    console.error('Erro ao instalar dependências:', error);
  }
  
  // Limpar diretório para ter certeza
  logSection('Preparando estrutura de diretórios');
  
  // Remover .next se existir
  if (fs.existsSync('.next')) {
    try {
      fs.rmSync('.next', { recursive: true, force: true });
    } catch (error) {
      console.error('Erro ao remover .next:', error);
    }
  }
  
  // Criar diretório pages
  const pagesDir = path.join(process.cwd(), 'pages');
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  
  // Criar diretório api para health check
  const apiDir = path.join(pagesDir, 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  // Criar página index mínima
  logSection('Criando páginas mínimas');
  
  const indexContent = `
import React from 'react';
import Head from 'next/head';

export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>Lino's Panificadora</title>
      </Head>
      
      <h1 style={{ color: '#4a4a4a' }}>Lino's Panificadora</h1>
      <h2 style={{ color: '#666' }}>Sistema Temporariamente em Manutenção</h2>
      
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '5px', 
        padding: '15px', 
        marginTop: '20px' 
      }}>
        <h3>Informações</h3>
        <ul>
          <li>O backend está funcionando normalmente</li>
          <li>API disponível em: <code>{process.env.NEXT_PUBLIC_API_URL}</code></li>
          <li>Frontend em manutenção para melhorias no sistema</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '40px', color: '#888', fontSize: '14px' }}>
        <p>© Lino's Panificadora - Todos os direitos reservados</p>
      </div>
    </div>
  );
}
`;
  
  fs.writeFileSync(path.join(pagesDir, 'index.js'), indexContent);
  console.log('Página index.js criada');
  
  // Criar health check API
  const healthContent = `
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'linos-frontend-minimal',
    environment: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  });
}
`;
  
  fs.writeFileSync(path.join(apiDir, 'health.js'), healthContent);
  console.log('API health check criada');
  
  // Criar next.config.js mínimo
  logSection('Criando configuração mínima');
  
  const nextConfigContent = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuramos apenas o redirecionamento básico
  async redirects() {
    return [
      {
        source: '/pedidos',
        destination: '/',
        permanent: false,
      },
      {
        source: '/clientes',
        destination: '/',
        permanent: false,
      },
      {
        source: '/produtos',
        destination: '/',
        permanent: false,
      }
    ];
  }
};

module.exports = nextConfig;
`;
  
  fs.writeFileSync('next.config.js', nextConfigContent);
  console.log('next.config.js criado');
  
  // Criar package.json simplificado se necessário
  const packageContent = {
    name: "linos-frontend-minimal",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start"
    }
  };
  
  fs.writeFileSync('package-minimal.json', JSON.stringify(packageContent, null, 2));
  console.log('package-minimal.json criado (usar se necessário)');
  
  // Executar build com página mínima
  logSection('Executando build');
  
  execSync('yarn next build', { stdio: 'inherit' });
  
  logSection('BUILD MINIMALISTA CONCLUÍDO COM SUCESSO');
  console.log('Frontend mínimo construído para garantir o deploy!');
  console.log('A aplicação real deverá ser reconstruída após as correções no projeto original.');
  
} catch (error) {
  console.error('\n\nERRO FATAL AO CRIAR APP MÍNIMO:');
  console.error(error);
  process.exit(1);
}
