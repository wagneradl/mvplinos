@echo off
chcp 65001 > NUL
echo ========================================================
echo          CORREÇÃO DEFINITIVA PARA WINDOWS
echo             Lino's Panificadora
echo ========================================================
echo.
echo Este script corrige problemas estruturais do projeto no Windows
echo usando uma abordagem manual que contorna o bug do Prisma.
echo.
echo Por favor, aguarde enquanto o sistema é reparado...
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Node.js não encontrado!
  echo Por favor, instale o Node.js (v16+) antes de continuar.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

REM Instalar Prisma globalmente
echo [1/8] Instalando ferramentas necessárias...
call npm install -g prisma typescript ts-node
if %ERRORLEVEL% NEQ 0 (
  echo [AVISO] Problema ao instalar ferramentas globais.
  echo Tentando continuar mesmo assim...
)

REM Limpar caches e estrutura existente
echo [2/8] Limpando ambiente...
rmdir /s /q node_modules 2>nul
rmdir /s /q packages\backend\node_modules 2>nul
rmdir /s /q packages\frontend\node_modules 2>nul
rmdir /s /q packages\shared\node_modules 2>nul
call npm cache clean --force
echo.

REM Instalar Prisma diretamente no pacote backend
echo [3/8] Instalando Prisma diretamente no backend...
cd packages\backend
call npm init -y
call npm install prisma@5.0.0 @prisma/client@5.0.0 --no-save
if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Falha ao instalar Prisma no backend.
  cd ..\..
  pause
  exit /b 1
)
echo.

REM Gerar cliente Prisma diretamente
echo [4/8] Gerando cliente Prisma localmente...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Falha ao gerar cliente Prisma.
  cd ..\..
  pause
  exit /b 1
)
echo.

REM Configurar banco de dados
echo [5/8] Configurando banco de dados...
call npx prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Falha ao configurar banco de dados.
  cd ..\..
  pause
  exit /b 1
)
cd ..\..
echo.

REM Criar estrutura de diretórios
echo [6/8] Criando diretórios necessários...
mkdir packages\backend\uploads 2>nul
mkdir packages\backend\uploads\pdfs 2>nul
mkdir packages\backend\uploads\static 2>nul

REM Copiar logo
echo [7/8] Configurando recursos estáticos...
if exist packages\backend\src\assets\images\logo.png (
  copy packages\backend\src\assets\images\logo.png packages\backend\uploads\static\logo.png /Y
  echo Logo copiada com sucesso.
) else (
  echo [AVISO] Arquivo de logo não encontrado.
)
echo.

REM Restaurar dependências normais
echo [8/8] Restaurando dependências do projeto...
cd packages\backend
call npm install
cd ..\frontend
call npm install
cd ..\..
echo.

echo ========================================================
echo            CORREÇÃO CONCLUÍDA COM SUCESSO!
echo ========================================================
echo.
echo Agora você pode iniciar o sistema usando:
echo.
echo Para execução em desenvolvimento:
echo   npm run --prefix packages/backend dev
echo   npm run --prefix packages/frontend dev
echo.
echo (Abra dois terminais separados para executar cada comando)
echo.
echo ========================================================
echo.
echo Gerando scripts de inicialização simplificados...

REM Criar scripts de inicialização simplificados
echo @echo off > start-backend.bat
echo echo Iniciando Backend... >> start-backend.bat
echo cd packages\backend >> start-backend.bat
echo npm run dev >> start-backend.bat

echo @echo off > start-frontend.bat
echo echo Iniciando Frontend... >> start-frontend.bat
echo cd packages\frontend >> start-frontend.bat
echo npm run dev >> start-frontend.bat

echo @echo off > start-all.bat
echo echo Iniciando Sistema Lino's Panificadora... >> start-all.bat
echo echo. >> start-all.bat
echo echo Abrindo backend em nova janela... >> start-all.bat
echo start cmd /k "start-backend.bat" >> start-all.bat
echo echo Aguardando backend inicializar... >> start-all.bat
echo timeout /t 10 /nobreak > NUL >> start-all.bat
echo echo Abrindo frontend em nova janela... >> start-all.bat
echo start cmd /k "start-frontend.bat" >> start-all.bat
echo echo. >> start-all.bat
echo echo Sistema em execução! >> start-all.bat
echo echo Acesse: http://localhost:3000 >> start-all.bat
echo echo. >> start-all.bat
echo timeout /t 5 /nobreak > NUL >> start-all.bat
echo start "" http://localhost:3000 >> start-all.bat

echo Scripts de inicialização gerados:
echo - start-backend.bat (apenas backend)
echo - start-frontend.bat (apenas frontend)
echo - start-all.bat (sistema completo)
echo.
echo Para iniciar o sistema completo, execute:
echo   start-all.bat
echo.
pause