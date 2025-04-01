@echo off
echo Corrigindo problemas do Prisma...

rem Navegar para o diretório do backend
cd packages\backend

rem Regenerar o cliente Prisma
echo Regenerando cliente Prisma...
call npx prisma generate

rem Aplicar migrações
echo Aplicando migrações...
call npx prisma migrate dev --name fix_model_names --create-only

echo Prisma corrigido com sucesso!

rem Voltar para o diretório raiz
cd ..\..
