# Definir codificação UTF-8 para evitar problemas de caracteres
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Instalação do Sistema Lino's Panificadora         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Função para verificar se um comando está disponível no sistema
function Test-CommandExists {
    param ([string]$Command)
    try {
        $commandExists = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Verificar e instalar o Node.js, se necessário
if (-not (Test-CommandExists "node")) {
    Write-Host "`nNode.js não encontrado! Instalando Node.js..." -ForegroundColor Yellow
    
    $nodeInstaller = "node-setup.msi"
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"

    # Baixar instalador
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller

    # Instalar silenciosamente
    Write-Host "`nInstalando Node.js..." -ForegroundColor Yellow
    Start-Process msiexec.exe -ArgumentList "/i $nodeInstaller /quiet /norestart" -Wait
    Remove-Item $nodeInstaller -Force

    # Atualizar variáveis de ambiente
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Verificar instalação
    if (-not (Test-CommandExists "node")) {
        Write-Host "Erro ao instalar o Node.js. Tente instalar manualmente." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "Node.js instalado com sucesso!" -ForegroundColor Green
    }
}

# Verificar versão do Node.js
$nodeVersion = node -v
Write-Host "`nVersão do Node.js encontrada: $nodeVersion" -ForegroundColor Green

# Criar pasta do npm global, se não existir (corrige erro ENOENT)
$npmGlobalPath = "$env:APPDATA\npm"
if (-not (Test-Path $npmGlobalPath)) {
    Write-Host "Criando diretório necessário para npm: $npmGlobalPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $npmGlobalPath -Force | Out-Null
}

# Verificar e instalar Yarn, se necessário
if (-not (Test-CommandExists "yarn")) {
    Write-Host "`nYarn não encontrado! Instalando Yarn..." -ForegroundColor Yellow
    npm install -g yarn

    # Atualizar variáveis de ambiente
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    if (-not (Test-CommandExists "yarn")) {
        Write-Host "Erro ao instalar Yarn. Tente instalar manualmente com 'npm install -g yarn'." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "Yarn instalado com sucesso!" -ForegroundColor Green
    }
}

# Instalar dependências
Write-Host "`n[1/7] Instalando dependências..." -ForegroundColor Yellow
yarn install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao instalar dependências. Tentando resolver..." -ForegroundColor Red
    yarn install --network-timeout 100000
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha persistente na instalação de dependências." -ForegroundColor Red
        exit 1
    }
}

# Instalar Prisma CLI globalmente para evitar problemas de caminho
Write-Host "`n[2/7] Instalando Prisma CLI e gerando cliente..." -ForegroundColor Yellow
npm install -g prisma
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao instalar Prisma CLI globalmente." -ForegroundColor Red
    exit 1
}

# Gerar cliente Prisma usando o CLI global
cd packages/backend
prisma generate
if ($LASTEXITCODE -ne 0) {
    # Tente alternativa com npx e caminho explícito
    Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
    $env:NODE_PATH = "$PWD\node_modules"
    npx --no-install prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao gerar cliente Prisma." -ForegroundColor Red
        cd ../..
        exit 1
    }
}
cd ../..

# Verificar/criar estrutura do banco de dados
Write-Host "`n[3/7] Configurando banco de dados..." -ForegroundColor Yellow
cd packages/backend
prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    # Tente alternativa com npx e caminho explícito
    Write-Host "Tentando método alternativo para migração..." -ForegroundColor Yellow
    $env:NODE_PATH = "$PWD\node_modules"
    npx --no-install prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao configurar banco de dados." -ForegroundColor Red
        cd ../..
        exit 1
    }
}
cd ../..

# Criar diretórios necessários
Write-Host "`n[4/7] Criando diretórios para uploads..." -ForegroundColor Yellow
$uploadsDir = "packages/backend/uploads"
$pdfsDir = "packages/backend/uploads/pdfs"
$staticDir = "packages/backend/uploads/static"

New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
New-Item -ItemType Directory -Path $pdfsDir -Force | Out-Null
New-Item -ItemType Directory -Path $staticDir -Force | Out-Null

# Copiar logo para diretório estático
Write-Host "`n[5/7] Copiando logo para diretório estático..." -ForegroundColor Yellow
$logoSource = "packages/backend/src/assets/images/logo.png"
$logoDestination = "packages/backend/uploads/static/logo.png"

if (Test-Path $logoSource) {
    Copy-Item $logoSource $logoDestination -Force
    Write-Host "Logo copiada com sucesso." -ForegroundColor Green
} else {
    Write-Host "AVISO: Arquivo de logo ($logoSource) não encontrado." -ForegroundColor Yellow
}

# Configurar permissões - CORRIGIDO usando método nativo do PowerShell
Write-Host "`n[6/7] Configurando permissões..." -ForegroundColor Yellow
try {
    $acl = Get-Acl $uploadsDir
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
    $acl.SetAccessRule($rule)
    Set-Acl $uploadsDir $acl
    Write-Host "Permissões configuradas com sucesso." -ForegroundColor Green
} catch {
    Write-Host "Aviso: Não foi possível configurar permissões. O sistema pode precisar ser executado como administrador." -ForegroundColor Yellow
}

# Configurar dados iniciais (opcional)
Write-Host "`n[7/7] Deseja inserir dados iniciais no banco de dados? (s/n)" -ForegroundColor Yellow
$INSERIR_DADOS = Read-Host

if ($INSERIR_DADOS -eq "s" -or $INSERIR_DADOS -eq "S") {
    Write-Host "Inserindo dados iniciais..." -ForegroundColor Green
    cd packages/backend
    
    # Usar seed.ts se existir, caso contrário usar SQL direto
    if (Test-Path "prisma/seed.ts") {
        npx ts-node prisma/seed.ts
    } else {
        # Criar arquivo SQL temporário
        @"
-- Inserir produtos
INSERT INTO Produto (nome, preco_unitario, tipo_medida, status) VALUES 
('Pão Francês', 15.90, 'kg', 'ATIVO'),
('Pão de Forma', 8.50, 'unidade', 'ATIVO'),
('Sonho', 4.50, 'unidade', 'ATIVO'),
('Bolo de Chocolate', 35.00, 'unidade', 'ATIVO');

-- Inserir clientes
INSERT INTO Cliente (cnpj, razao_social, nome_fantasia, telefone, email, status) VALUES 
('12.345.678/0001-90', 'Restaurante Silva Ltda', 'Cantina do Silva', '(11) 98765-4321', 'contato@silvacantina.com.br', 'ATIVO'),
('98.765.432/0001-10', 'Hotel Central S.A.', 'Hotel Central', '(11) 91234-5678', 'compras@hotelcentral.com.br', 'ATIVO');
"@ | Out-File -Encoding utf8 "dados_iniciais.sql"

        # Executar SQL
        npx prisma db execute --file=./dados_iniciais.sql

        # Remover arquivo temporário
        Remove-Item "dados_iniciais.sql" -Force
    }
    
    cd ../..
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "      Instalação concluída com sucesso!                  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o sistema em modo desenvolvimento:" -ForegroundColor Yellow
Write-Host "  yarn dev" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar o sistema em produção (após build):" -ForegroundColor Yellow
Write-Host "  yarn build" -ForegroundColor White
Write-Host "  yarn start" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Se ocorrerem erros ao iniciar o sistema," -ForegroundColor Red
Write-Host "contate o suporte técnico para assistência." -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Cyan