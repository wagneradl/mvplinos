#!/bin/bash
# Script para corrigir problemas de consistência no Prisma

echo "Corrigindo problemas do Prisma..."

# Navegar para o diretório do backend
cd packages/backend

# Regenerar o cliente Prisma
echo "Regenerando cliente Prisma..."
npx prisma generate

# Aplicar migrações
echo "Aplicando migrações..."
npx prisma migrate dev --name fix_model_names --create-only

echo "Prisma corrigido com sucesso!"
