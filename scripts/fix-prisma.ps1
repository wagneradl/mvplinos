# Script para corrigir problemas de consistência no Prisma

Write-Host "Corrigindo problemas do Prisma..." -ForegroundColor Cyan

# Navegar para o diretório do backend
Set-Location packages\backend

# Regenerar o cliente Prisma
Write-Host "Regenerando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate

# Aplicar migrações
Write-Host "Aplicando migrações..." -ForegroundColor Yellow
npx prisma migrate dev --name fix_model_names --create-only

Write-Host "Prisma corrigido com sucesso!" -ForegroundColor Green

# Voltar para o diretório raiz
Set-Location ..\..
