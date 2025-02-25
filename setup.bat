@echo off
chcp 65001 > NUL
echo ========================================================
echo      Instalação do Sistema Lino's Panificadora
echo ========================================================

echo Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Node.js não encontrado! Por favor, instale o Node.js e tente novamente.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

echo Verificando Yarn...
where yarn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Yarn não encontrado! Instalando...
  call npm install -g yarn
  if %ERRORLEVEL% NEQ 0 (
    echo Falha ao instalar Yarn. Tente manualmente com 'npm install -g yarn'.
    pause
    exit /b 1
  )
)

echo Versão do Node.js:
call node -v

echo.
echo [1/7] Instalando dependências...
call yarn install
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao instalar dependências. Tentando com timeout maior...
  call yarn install --network-timeout 100000
  if %ERRORLEVEL% NEQ 0 (
    echo Falha na instalação de dependências. Tente executar fix-prisma.bat.
    pause
    exit /b 1
  )
)

echo.
echo [2/7] Instalando Prisma CLI...
call npm install -g prisma
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao instalar Prisma CLI globalmente.
  pause
  exit /b 1
)

echo.
echo [2/7] Gerando cliente Prisma...
cd packages\backend
call prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao gerar cliente Prisma. Tentando método alternativo...
  set NODE_PATH=%CD%\node_modules
  call npx --no-install prisma generate
  if %ERRORLEVEL% NEQ 0 (
    echo Falha persistente com Prisma. Execute fix-prisma.bat.
    cd ..\..
    pause
    exit /b 1
  )
)

echo.
echo [3/7] Configurando banco de dados...
call prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
  echo Falha ao configurar banco de dados.
  cd ..\..
  pause
  exit /b 1
)
cd ..\..

echo.
echo [4/7] Criando diretórios para uploads...
mkdir packages\backend\uploads 2>nul
mkdir packages\backend\uploads\pdfs 2>nul
mkdir packages\backend\uploads\static 2>nul

echo.
echo [5/7] Copiando logo para diretório estático...
if exist packages\backend\src\assets\images\logo.png (
  copy packages\backend\src\assets\images\logo.png packages\backend\uploads\static\logo.png
  echo Logo copiada com sucesso.
) else (
  echo AVISO: Arquivo de logo não encontrado.
)

echo.
echo [6/7] Configurando permissões...
echo (No Windows isso geralmente não é necessário)

echo.
echo [7/7] Deseja inserir dados iniciais no banco de dados? (s/n)
set /p INSERIR_DADOS=""

if /i "%INSERIR_DADOS%"=="s" (
  echo Inserindo dados iniciais...
  cd packages\backend
  
  if exist prisma\seed.ts (
    call npx ts-node prisma\seed.ts
  ) else (
    echo -- Criando dados iniciais básicos...
    echo.
    echo -- Inserir produtos > dados_iniciais.sql
    echo INSERT INTO Produto (nome, preco_unitario, tipo_medida, status) VALUES > dados_iniciais.sql
    echo ('Pão Francês', 15.90, 'kg', 'ATIVO'), >> dados_iniciais.sql
    echo ('Pão de Forma', 8.50, 'unidade', 'ATIVO'), >> dados_iniciais.sql
    echo ('Sonho', 4.50, 'unidade', 'ATIVO'), >> dados_iniciais.sql
    echo ('Bolo de Chocolate', 35.00, 'unidade', 'ATIVO'); >> dados_iniciais.sql
    echo. >> dados_iniciais.sql
    echo -- Inserir clientes >> dados_iniciais.sql
    echo INSERT INTO Cliente (cnpj, razao_social, nome_fantasia, telefone, email, status) VALUES >> dados_iniciais.sql
    echo ('12.345.678/0001-90', 'Restaurante Silva Ltda', 'Cantina do Silva', '(11) 98765-4321', 'contato@exemplo.com', 'ATIVO'), >> dados_iniciais.sql
    echo ('98.765.432/0001-10', 'Hotel Central S.A.', 'Hotel Central', '(11) 91234-5678', 'hotel@exemplo.com', 'ATIVO'); >> dados_iniciais.sql

    call npx prisma db execute --file=./dados_iniciais.sql
    del dados_iniciais.sql
  )
  
  cd ..\..
)

echo.
echo ========================================================
echo      Instalação concluída com sucesso!
echo ========================================================
echo.
echo Para iniciar o sistema em modo desenvolvimento:
echo   start-windows.bat
echo.
echo Para iniciar o sistema em produção (após build):
echo   deploy-windows.bat
echo.
echo.
echo IMPORTANTE: Se ocorrerem erros ao iniciar o sistema,
echo execute o script fix-prisma.bat para resolver problemas
echo com o Prisma.
echo ========================================================
pause