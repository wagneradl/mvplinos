/**
 * Script para configuração completa do sistema no ambiente Render
 * Este script executa todas as etapas necessárias para inicializar o sistema
 */

const { execSync } = require('child_process');
const { setupStaticFiles } = require('./setup-static');

async function fullSetup() {
  try {
    console.log('🚀 Iniciando configuração completa do sistema Lino\'s Panificadora no Render...');
    
    // Etapa 1: Gerar cliente Prisma
    console.log('\n📦 Gerando cliente Prisma...');
    execSync('yarn prisma generate', { stdio: 'inherit' });
    
    // Etapa 2: Aplicar migrações do banco de dados
    console.log('\n🗄️ Aplicando migrações do banco de dados...');
    execSync('yarn prisma migrate deploy', { stdio: 'inherit' });
    
    // Etapa 3: Configurar arquivos estáticos
    console.log('\n🖼️ Configurando arquivos estáticos...');
    await setupStaticFiles();
    
    // Etapa 4: Verificar se há dados iniciais, e aplicar seed se necessário
    console.log('\n🌱 Verificando dados iniciais...');
    
    try {
      // Aqui poderíamos verificar se o banco já tem dados e só aplicar o seed se necessário
      // Por ora, vamos apenas notificar, mas não executar automaticamente para evitar duplicação
      console.log('⚠️ Se necessário, execute o seed manualmente com: yarn seed');
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
