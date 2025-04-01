/**
 * Script para configurar arquivos estáticos no ambiente de nuvem
 * Este script copia a logo e outros arquivos estáticos necessários para os diretórios corretos
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

async function setupStaticFiles() {
  try {
    console.log('Iniciando configuração de arquivos estáticos...');
    
    // Determinar os diretórios usando variáveis de ambiente
    const uploadsPath = process.env.UPLOADS_PATH || '/var/data';
    const staticPath = path.join(uploadsPath, 'static');
    
    // Garantir que o diretório estático existe
    await mkdir(staticPath, { recursive: true });
    console.log(`Diretório estático criado: ${staticPath}`);
    
    // Caminho para a logo no repositório
    const repoLogoPath = path.join(process.cwd(), 'uploads', 'static', 'logo.png');
    const targetLogoPath = path.join(staticPath, 'logo.png');
    
    // Verificar se a logo existe no repositório
    if (await exists(repoLogoPath)) {
      // Copiar logo para o diretório estático
      await copyFile(repoLogoPath, targetLogoPath);
      console.log(`Logo copiada para: ${targetLogoPath}`);
    } else {
      console.warn(`Aviso: Logo não encontrada em: ${repoLogoPath}`);
    }
    
    // Adicionar outros arquivos estáticos aqui, se necessário
    
    console.log('Configuração de arquivos estáticos concluída com sucesso.');
    return {
      success: true,
      staticPath,
      files: ['logo.png']
    };
  } catch (error) {
    console.error('Erro ao configurar arquivos estáticos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o setup se este arquivo for chamado diretamente
if (require.main === module) {
  setupStaticFiles();
}

module.exports = { setupStaticFiles };
