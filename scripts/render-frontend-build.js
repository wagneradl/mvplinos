/**
 * Script específico para o build do frontend no Render
 * Este script garante que todas as dependências de tipos necessárias estejam instaladas
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('='.repeat(80));
  console.log('Iniciando build do frontend para Render');
  console.log('='.repeat(80));
  
  // Navegar para o diretório do frontend
  process.chdir(path.join(process.cwd(), 'packages', 'frontend'));
  console.log('Diretório atual: ' + process.cwd());
  
  // Limpar diretório de build
  console.log('\nLimpando diretório de build...');
  execSync('yarn clean', { stdio: 'inherit' });
  
  // Garantir que todas as dependências estão instaladas
  console.log('\nInstalando dependências de tipos React...');
  execSync('yarn add --dev @types/react@18.2.12', { stdio: 'inherit' });
  
  // Verificar conteúdo do node_modules/@types/react
  const reactTypesPath = path.join(process.cwd(), 'node_modules', '@types', 'react');
  if (fs.existsSync(reactTypesPath)) {
    console.log(`\n@types/react instalado em ${reactTypesPath}`);
    const files = fs.readdirSync(reactTypesPath);
    console.log('Arquivos disponíveis:', files);
  } else {
    console.log('\nAVISO: @types/react não encontrado no caminho esperado!');
    // Tentar instalar novamente com npm como último recurso
    console.log('Tentando instalar com npm...');
    execSync('npm install --save-dev @types/react@18.2.12', { stdio: 'inherit' });
  }
  
  // Verificar outras dependências críticas
  console.log('\nVerificando outras dependências de tipos...');
  const requiredTypes = [
    '@types/react-dom',
    '@types/node'
  ];
  
  for (const typePkg of requiredTypes) {
    const typePath = path.join(process.cwd(), 'node_modules', typePkg);
    if (!fs.existsSync(typePath)) {
      console.log(`${typePkg} não encontrado, instalando...`);
      execSync(`yarn add --dev ${typePkg}`, { stdio: 'inherit' });
    } else {
      console.log(`${typePkg} já instalado.`);
    }
  }
  
  // Executar o build do Next.js
  console.log('\nIniciando build do Next.js...');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('\n' + '='.repeat(80));
  console.log('Build do frontend concluído com sucesso!');
  console.log('='.repeat(80));
} catch (error) {
  console.error('\n\nERRO DURANTE O BUILD DO FRONTEND:');
  console.error(error);
  process.exit(1);
}
