#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "🧪 Iniciando simulação de ambiente Render..."

# Verificar se o yarn.lock está atualizado
echo "🔍 Verificando consistência do yarn.lock..."
cd ../../
yarn install --check-files || { 
  echo "❌ yarn.lock desatualizado! Execute 'yarn install' na raiz do projeto antes do deploy."; 
  exit 1; 
}
echo "✅ yarn.lock está atualizado e consistente"
cd packages/backend

# Limpar diretórios anteriores
rm -rf node_modules dist

# Criar estrutura simulada para testar volumes
echo "📂 Configurando estrutura de diretórios..."
mkdir -p /tmp/render-test/var/data/pdfs
mkdir -p /tmp/render-test/var/data/uploads/pdfs
mkdir -p /tmp/render-test/var/data/uploads/static

# Instalar apenas dependências de produção (sem devDependencies)
echo "📦 Instalando dependências de produção..."
NODE_ENV=production yarn install --production

# Verificar se nest CLI está disponível
echo "🔍 Verificando CLI do NestJS..."
if [ -f "./node_modules/.bin/nest" ]; then
  echo "✅ NestJS CLI encontrado em node_modules/.bin/nest"
else
  echo "❌ NestJS CLI NÃO ENCONTRADO! O build vai falhar no Render."
  exit 1
fi

# Executar o script de pós-instalação do Render
echo "🔧 Executando script de pós-instalação do Render..."
if [ -f "../../scripts/render-postinstall.js" ]; then
  node ../../scripts/render-postinstall.js
else
  echo "⚠️ Script render-postinstall.js não encontrado. Pulando."
fi

# Gerar código do Prisma
echo "🗃️ Gerando código do Prisma..."
npx prisma generate

# Simular o build no Render
echo "🏗️ Executando build..."
yarn build

# Verificar se o build foi bem-sucedido
if [ -d "./dist" ]; then
  echo "✅ Build concluído com sucesso! Diretório 'dist' foi criado."
else 
  echo "❌ Build falhou! Diretório 'dist' não encontrado."
  exit 1
fi

echo "🧹 Limpando ambiente de teste..."

# Limpar diretórios de teste
rm -rf /tmp/render-test

echo "✨ Simulação concluída! Se tudo passou, o build deve funcionar no Render."
