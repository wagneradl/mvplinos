@echo off
echo ========================================================
echo      Corrigindo problemas do Prisma para Windows
echo ========================================================

echo 1. Instalando Prisma CLI globalmente...
call npm install -g prisma
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao instalar Prisma CLI globalmente.
  pause
  exit /b %ERRORLEVEL%
)

echo 2. Removendo pasta node_modules...
rmdir /s /q node_modules
if %ERRORLEVEL% NEQ 0 (
  echo Aviso: Não foi possível remover completamente node_modules.
)

echo 3. Limpando cache do Yarn...
call yarn cache clean
if %ERRORLEVEL% NEQ 0 (
  echo Aviso: Não foi possível limpar o cache do Yarn.
)

echo 4. Reinstalando dependências...
call yarn install --force
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao reinstalar dependências.
  pause
  exit /b %ERRORLEVEL%
)

echo 5. Configurando Prisma...
cd packages\backend
call prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao gerar cliente Prisma.
  cd ..\..
  pause
  exit /b %ERRORLEVEL%
)

echo 6. Aplicando migrações do banco de dados...
call prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao aplicar migrações.
  cd ..\..
  pause
  exit /b %ERRORLEVEL%
)

cd ..\..
echo ========================================================
echo      Correção concluída com sucesso!
echo ========================================================
echo Para iniciar o sistema, use o comando:
echo   start-windows.bat
echo.
pause