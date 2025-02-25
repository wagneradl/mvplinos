@echo off
echo ========================================================
echo        Deploy do Sistema Lino's Panificadora
echo ========================================================

echo Realizando build do projeto...
call yarn build
if %ERRORLEVEL% NEQ 0 (
  echo Erro ao realizar build do projeto.
  exit /b %ERRORLEVEL%
)

echo.
echo Gerando cliente Prisma...
cd packages\backend
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo Erro ao gerar cliente Prisma.
  cd ..\..
  exit /b %ERRORLEVEL%
)

echo.
echo Aplicando migrações do banco de dados...
call npx prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
  echo Erro ao aplicar migrações do banco de dados.
  cd ..\..
  exit /b %ERRORLEVEL%
)
cd ..\..

echo.
echo Iniciando o sistema em modo produção...
start cmd /k "cd packages\backend && yarn start:prod"

echo Aguardando inicialização do backend...
timeout /t 5 /nobreak > NUL

start cmd /k "cd packages\frontend && yarn start"

echo.
echo ========================================================
echo Deploy concluído com sucesso!
echo ========================================================
echo.
echo Sistema disponível em:
echo   - Frontend: http://localhost:3000
echo   - API: http://localhost:3001
echo.
echo Digite qualquer tecla para abrir o sistema no navegador...
pause > NUL
start "" http://localhost:3000