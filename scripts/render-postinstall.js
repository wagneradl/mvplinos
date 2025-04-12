/**
 * Script de pós-instalação para o Render
 * Este script é executado após a instalação para configurar o ambiente corretamente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`${title}`);
  console.log('='.repeat(80));
}

try {
  logSection('VERIFICANDO AMBIENTE RENDER');
  console.log('Diretório atual:', process.cwd());
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado (oculto)' : 'Não configurado');
  
  logSection('VERIFICANDO ESTRUTURA DO PROJETO');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    console.log('Projeto:', packageJson.name);
    console.log('Versão:', packageJson.version);
  } else {
    console.log('package.json não encontrado!');
  }
  
  logSection('VERIFICANDO PRISMA');
  try {
    const prismaPath = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
    if (fs.existsSync(prismaPath)) {
      console.log('Prisma encontrado em:', prismaPath);
    } else {
      console.log('Prisma não encontrado no caminho esperado. Tentando instalar...');
      execSync('npm install prisma --no-save', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Erro ao verificar Prisma:', error.message);
  }
  
  logSection('CONFIGURANDO AMBIENTE');
  
  // Garantir que os diretórios de dados existam
  if (process.env.UPLOADS_PATH) {
    const uploadsPath = process.env.UPLOADS_PATH;
    const pdfsPath = process.env.PDF_STORAGE_PATH || path.join(uploadsPath, 'pdfs');
    const staticPath = path.join(uploadsPath, 'static');
    
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      fs.mkdirSync(pdfsPath, { recursive: true });
      fs.mkdirSync(staticPath, { recursive: true });
      
      console.log(`Diretórios criados:
- ${uploadsPath}
- ${pdfsPath}
- ${staticPath}`);
    } catch (err) {
      console.error('Erro ao criar diretórios:', err.message);
    }
  } else {
    console.log('UPLOADS_PATH não configurado. Pulando criação de diretórios.');
  }
  
  logSection('CONCLUSÃO');
  console.log('Script de pós-instalação concluído com sucesso.');
} catch (error) {
  console.error('ERRO NO SCRIPT DE PÓS-INSTALAÇÃO:', error);
  process.exit(1);
}
