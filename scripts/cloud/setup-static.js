/**
 * Script para configurar arquivos estáticos no ambiente de nuvem
 * Este script copia a logo e outros arquivos estáticos necessários para os diretórios corretos
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.existsSync);
const readdir = promisify(fs.readdir);

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
    const repoLogoPath = path.join(process.cwd(), '..', '..', 'uploads', 'static', 'logo.png');
    const repoLogoPathAlt = path.join(process.cwd(), 'uploads', 'static', 'logo.png');
    const targetLogoPath = path.join(staticPath, 'logo.png');
    
    // Verificar se a logo existe no repositório (tentando vários caminhos possíveis)
    let logoFound = false;
    
    if (fs.existsSync(repoLogoPath)) {
        // Copiar logo para o diretório estático
        await copyFile(repoLogoPath, targetLogoPath);
        console.log(`Logo copiada de ${repoLogoPath} para: ${targetLogoPath}`);
        logoFound = true;
    } else if (fs.existsSync(repoLogoPathAlt)) {
        // Tentar caminho alternativo
        await copyFile(repoLogoPathAlt, targetLogoPath);
        console.log(`Logo copiada de ${repoLogoPathAlt} para: ${targetLogoPath}`);
        logoFound = true;
    } else {
        console.warn(`Aviso: Logo não encontrada nos caminhos esperados.`);
        
        // Tentar procurar a logo em outros diretórios
        console.log('Procurando logo em diretórios alternativos...');
        
        // Procurar recursivamente por arquivos logo.png
        const findLogo = async (dir, depth = 0) => {
            if (depth > 3) return null; // Limitar profundidade da busca
            
            try {
                const files = await readdir(dir, { withFileTypes: true });
                
                for (const file of files) {
                    const fullPath = path.join(dir, file.name);
                    
                    if (file.isDirectory()) {
                        const foundInSubdir = await findLogo(fullPath, depth + 1);
                        if (foundInSubdir) return foundInSubdir;
                    } else if (file.name === 'logo.png') {
                        return fullPath;
                    }
                }
            } catch (err) {
                // Ignorar erros de permissão
            }
            
            return null;
        };
        
        const rootDir = path.join(process.cwd(), '..', '..');
        const foundLogo = await findLogo(rootDir);
        
        if (foundLogo) {
            await copyFile(foundLogo, targetLogoPath);
            console.log(`Logo encontrada e copiada de ${foundLogo} para: ${targetLogoPath}`);
            logoFound = true;
        }
    }
    
    if (!logoFound) {
        console.warn('Não foi possível encontrar o arquivo logo.png. A aplicação funcionará sem a logo.');
    }
    
    // Adicionar outros arquivos estáticos aqui, se necessário
    
    console.log('Configuração de arquivos estáticos concluída com sucesso.');
    return {
      success: true,
      staticPath,
      logoFound
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
