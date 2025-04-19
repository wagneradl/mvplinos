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
  
  // O disco persistente pode não estar montado durante a fase de build
  // Vamos criar diretórios temporários que serão usados apenas durante o build
  // IMPORTANTE: NÃO ALTERAR DATABASE_URL PARA BANCO TEMPORÁRIO!
  if (process.env.UPLOADS_PATH) {
    try {
      const uploadsPath = process.env.UPLOADS_PATH;
      
      // Primeiro, vamos verificar se o diretório já existe ou está acessível
      if (!fs.existsSync(uploadsPath)) {
        console.log(`Diretório ${uploadsPath} não existe. Tentando criar...`);
        
        // Se não conseguirmos criar em /var/data, usaremos um diretório temporário
        try {
          fs.mkdirSync(uploadsPath, { recursive: true });
          console.log(`Diretório ${uploadsPath} criado com sucesso.`);
        } catch (err) {
          console.log(`Não foi possível criar ${uploadsPath}. Usando alternativa...`);
          
          // Criar diretório temporário para uso durante o build
          const tempUploadsPath = path.join(process.cwd(), 'temp_uploads');
          fs.mkdirSync(tempUploadsPath, { recursive: true });
          // Sobrescrever apenas os paths de upload temporários, mas NÃO o DATABASE_URL
          process.env.UPLOADS_PATH = tempUploadsPath;
          process.env.PDF_STORAGE_PATH = path.join(tempUploadsPath, 'pdfs');
          
          console.log(`Diretórios temporários criados em ${tempUploadsPath}`);
          fs.mkdirSync(process.env.PDF_STORAGE_PATH, { recursive: true });
          fs.mkdirSync(path.join(tempUploadsPath, 'static'), { recursive: true });
        }
      } else {
        console.log(`Diretório ${uploadsPath} já existe.`);
        
        // Verificar e criar subdiretórios
        const pdfsPath = process.env.PDF_STORAGE_PATH || path.join(uploadsPath, 'pdfs');
        const staticPath = path.join(uploadsPath, 'static');
        
        if (!fs.existsSync(pdfsPath)) {
          fs.mkdirSync(pdfsPath, { recursive: true });
        }
        
        if (!fs.existsSync(staticPath)) {
          fs.mkdirSync(staticPath, { recursive: true });
        }
        
        console.log(`Subdiretórios verificados/criados:
- ${pdfsPath}
- ${staticPath}`);
      }
    } catch (err) {
      console.error('Erro ao criar diretórios de upload:', err.message);
    }
  } else {
    console.log('UPLOADS_PATH não configurado. Configurando diretório temporário...');
    const tempUploadsPath = path.join(process.cwd(), 'temp_uploads');
    process.env.UPLOADS_PATH = tempUploadsPath;
    process.env.PDF_STORAGE_PATH = path.join(tempUploadsPath, 'pdfs');
    
    fs.mkdirSync(tempUploadsPath, { recursive: true });
    fs.mkdirSync(process.env.PDF_STORAGE_PATH, { recursive: true });
    fs.mkdirSync(path.join(tempUploadsPath, 'static'), { recursive: true });
    
    console.log(`Diretórios temporários criados:
- ${tempUploadsPath}
- ${process.env.PDF_STORAGE_PATH}
- ${path.join(tempUploadsPath, 'static')}`);
  }
  
  // Removido: Ajuste do DATABASE_URL para banco temporário durante o build
  // O seed e as migrations devem rodar SEMPRE no banco de produção
  
  logSection('CONCLUSÃO');
  console.log('Script de pós-instalação concluído com sucesso.');
} catch (error) {
  console.error('ERRO NO SCRIPT DE PÓS-INSTALAÇÃO:', error);
  process.exit(1);
}
