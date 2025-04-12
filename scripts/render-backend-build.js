/**
 * Script específico para o build do backend no Render
 * Este script garante que o NestJS CLI e o Prisma estejam disponíveis para o build
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
  logSection('Iniciando build do backend para Render');
  
  // Navegar para o diretório do backend
  process.chdir(path.join(process.cwd(), 'packages', 'backend'));
  console.log('Diretório atual: ' + process.cwd());
  
  // Instalar o NestJS CLI e outras dependências essenciais
  logSection('Instalando dependências necessárias');
  execSync('npm install --no-save @nestjs/cli typescript @types/node', { stdio: 'inherit' });
  
  // Instalar o Prisma CLI localmente
  logSection('Instalando o Prisma CLI');
  execSync('npm install --no-save prisma', { stdio: 'inherit' });
  
  // Gerar cliente Prisma
  logSection('Gerando cliente Prisma');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Criar um tsconfig temporário para o build que exclui os arquivos de teste
  logSection('Configurando build para produção (sem testes)');
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  let tsconfig;
  
  if (fs.existsSync(tsconfigPath)) {
    const tsconfigRaw = fs.readFileSync(tsconfigPath, 'utf8');
    tsconfig = JSON.parse(tsconfigRaw);
    
    // Fazer backup do tsconfig original
    fs.writeFileSync(tsconfigPath + '.backup', tsconfigRaw);
    
    // Modificar o tsconfig para excluir testes e mocks
    tsconfig.exclude = [
      "**/__tests__/**",
      "**/__mocks__/**",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/test/**",
      "node_modules"
    ];
    
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    console.log('Arquivo tsconfig.json modificado temporariamente para excluir testes');
  } else {
    console.log('AVISO: tsconfig.json não encontrado!');
  }
  
  // Compilar o projeto NestJS com o tsc diretamente (sem usar o CLI do Nest)
  try {
    logSection('Compilando o projeto NestJS com tsc');
    execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
  } catch (buildError) {
    console.error('Erro durante a compilação com tsc:', buildError);
    console.log('Tentando método alternativo com swc...');
    
    // Tentar usar o swc como alternativa
    execSync('npm install --no-save @swc/cli @swc/core', { stdio: 'inherit' });
    execSync('npx swc src -d dist', { stdio: 'inherit' });
  }
  
  // Verificar se a compilação gerou a pasta dist
  if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
    console.log('Compilação concluída! Diretório dist criado.');
  } else {
    throw new Error('A compilação falhou. O diretório dist não foi criado.');
  }
  
  // Restaurar o tsconfig original, se foi feito backup
  if (fs.existsSync(tsconfigPath + '.backup')) {
    fs.copyFileSync(tsconfigPath + '.backup', tsconfigPath);
    fs.unlinkSync(tsconfigPath + '.backup');
    console.log('Arquivo tsconfig.json restaurado ao estado original');
  }
  
  logSection('Build do backend concluído com sucesso!');
} catch (error) {
  console.error('\n\nERRO DURANTE O BUILD DO BACKEND:');
  console.error(error);
  process.exit(1);
}
