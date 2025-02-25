#!/bin/bash

# Verificar e corrigir problemas de dependências
echo "Instalando dependências..."
yarn install

# Forçar a regeneração do cliente Prisma
echo "Regenerando cliente Prisma..."
npx prisma generate

# Limpar caches
echo "Limpando caches..."
rm -rf packages/frontend/.next
rm -rf packages/frontend/node_modules/.cache
rm -rf node_modules/.cache

# Construir o projeto com --no-lint para evitar problemas de linting
echo "Construindo o projeto..."
cd packages/frontend && yarn build --no-lint

echo "Processo concluído!"
