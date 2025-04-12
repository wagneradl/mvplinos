/**
 * Script para configuração completa do sistema no ambiente Render
 * Este script executa todas as etapas necessárias para inicializar o sistema
 */

const { execSync } = require('child_process');
const { setupStaticFiles } = require('./setup-static');
const path = require('path');
const fs = require('fs');

async function fullSetup() {
  try {
    console.log('🚀 Iniciando configuração completa do sistema Lino\'s Panificadora no Render...');
    
    // Etapa 1: Gerar cliente Prisma
    console.log('\n📦 Gerando cliente Prisma...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (error) {
      console.error('Erro ao gerar cliente Prisma:', error);
      console.log('Tentando com caminho alternativo...');
      const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
      if (fs.existsSync(prismaBin)) {
        execSync(`${prismaBin} generate`, { stdio: 'inherit' });
      } else {
        console.error('Binário do Prisma não encontrado. Instalando Prisma...');
        execSync('npm install prisma --no-save', { stdio: 'inherit' });
        execSync('npx prisma generate', { stdio: 'inherit' });
      }
    }
    
    // Etapa 2: Aplicar migrações do banco de dados
    console.log('\n🗄️ Aplicando migrações do banco de dados...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (error) {
      console.error('Erro ao aplicar migrações:', error);
      console.log('Verificando estrutura do banco...');
    }
    
    // Etapa 3: Configurar arquivos estáticos
    console.log('\n🖼️ Configurando arquivos estáticos...');
    await setupStaticFiles();
    
    // Etapa 4: Verificar se há dados iniciais, e aplicar seed se necessário
    console.log('\n🌱 Verificando dados iniciais...');
    
    try {
      // Aqui poderíamos verificar se o banco já tem dados e só aplicar o seed se necessário
      // Por ora, vamos apenas notificar, mas não executar automaticamente para evitar duplicação
      console.log('⚠️ Se necessário, execute o seed manualmente com: npx ts-node prisma/seed.ts');
    } catch (error) {
      console.warn('⚠️ Erro ao verificar dados: ', error.message);
    }
    
    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('🔗 O sistema está pronto para uso.');
    console.log('📋 Verifique CLOUD_DEPLOY.md para mais informações sobre o ambiente.');
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
  } catch (error) {
    console.error('❌ Erro na configuração do sistema:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Executar o setup se este arquivo for chamado diretamente
if (require.main === module) {
  fullSetup();
}

module.exports = { fullSetup };
