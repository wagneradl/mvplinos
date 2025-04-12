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
  
  // Instalar o NestJS CLI localmente
  logSection('Instalando o NestJS CLI');
  execSync('npm install --no-save @nestjs/cli', { stdio: 'inherit' });
  
  // Instalar o Prisma CLI localmente
  logSection('Instalando o Prisma CLI');
  execSync('npm install --no-save prisma', { stdio: 'inherit' });
  
  // Verificar se os binários foram instalados corretamente
  const nestBin = path.join(process.cwd(), 'node_modules', '.bin', 'nest');
  const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
  
  if (fs.existsSync(nestBin)) {
    console.log('NestJS CLI instalado em ' + nestBin);
  } else {
    console.log('AVISO: NestJS CLI não encontrado no caminho esperado!');
  }
  
  if (fs.existsSync(prismaBin)) {
    console.log('Prisma CLI instalado em ' + prismaBin);
  } else {
    console.log('AVISO: Prisma CLI não encontrado no caminho esperado!');
  }
  
  // Gerar cliente Prisma
  logSection('Gerando cliente Prisma');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Compilar o projeto NestJS
  logSection('Compilando o projeto NestJS');
  execSync('npx @nestjs/cli build', { stdio: 'inherit' });
  
  logSection('Build do backend concluído com sucesso!');
} catch (error) {
  console.error('\n\nERRO DURANTE O BUILD DO BACKEND:');
  console.error(error);
  process.exit(1);
}
