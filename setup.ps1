# setup.ps1 - Script de instalação e configuração do Sistema Lino's Panificadora

Write-Host "========================================================"
Write-Host "      Instalação do Sistema Lino's Panificadora         "
Write-Host "========================================================"

# Função para verificar se um programa está instalado
function Test-CommandExists {
    param ([string]$Command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $commandExists = Get-Command $Command -ErrorAction Stop
    $ErrorActionPreference = $oldPreference
    return $commandExists -ne $null
}

# Verificar se o Node.js está instalado
if (-not (Test-CommandExists node)) {
    Write-Host "`nNode.js não encontrado! Instalando Node.js..."
    
    # Baixar o instalador do Node.js
    $nodeInstaller = "node-setup.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi" -OutFile $nodeInstaller

    # Executar o instalador silenciosamente
    Write-Host "`nInstalando Node.js..."
    Start-Process msiexec.exe -ArgumentList "/i $nodeInstaller /quiet /norestart" -Wait

    # Remover o instalador após a instalação
    Remove-Item $nodeInstaller -Force

    # Adicionar Node.js ao PATH
    $env:Path += ";C:\Program Files\nodejs\"

    # Verificar instalação
    if (Test-CommandExists node) {
        Write-Host "Node.js instalado com sucesso!"
    } else {
        Write-Host "Erro ao instalar o Node.js. Tente instalar manualmente."
        exit 1
    }
} else {
    $nodeVersion = node -v
    Write-Host "`nVersão do Node.js encontrada: $nodeVersion"
    if ($nodeVersion -notmatch "^v20") {
        Write-Host "AVISO: Recomendado Node.js v20.x LTS. Versão atual: $nodeVersion"
    }
}

# Instalar dependências
Write-Host "`n[1/7] Instalando dependências..."
yarn install

# Gerar cliente Prisma
Write-Host "`n[2/7] Gerando cliente Prisma..."
npx prisma generate

# Verificar/criar estrutura do banco de dados
Write-Host "`n[3/7] Configurando banco de dados..."
npx prisma migrate deploy

# Criar diretórios necessários
Write-Host "`n[4/7] Criando diretórios para uploads..."
New-Item -ItemType Directory -Path "uploads/pdfs" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads/static" -Force | Out-Null

# Copiar logo para diretório estático (se existir)
if (Test-Path "Linos.png") {
    Write-Host "`n[5/7] Copiando logo para diretório estático..."
    Copy-Item "Linos.png" "uploads/static/logo.png" -Force
} else {
    Write-Host "`n[5/7] AVISO: Arquivo de logo (Linos.png) não encontrado."
    Write-Host "Você precisará adicionar manualmente um arquivo logo.png em uploads/static/"
}

# Configurar permissões (não necessário no Windows, mas podemos ajustar)
Write-Host "`n[6/7] Configurando permissões..."
icacls "uploads" /grant Everyone:F /T /C

# Configurar dados iniciais (opcional)
Write-Host "`n[7/7] Deseja inserir dados iniciais no banco de dados? (s/n)"
$INSERIR_DADOS = Read-Host

if ($INSERIR_DADOS -eq "s" -or $INSERIR_DADOS -eq "S") {
    Write-Host "Inserindo dados iniciais..."

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

Write-Host "`n========================================================"
Write-Host "      Instalação concluída com sucesso!                  "
Write-Host "========================================================"
Write-Host ""
Write-Host "Para iniciar o sistema em modo desenvolvimento:"
Write-Host "  yarn dev"
Write-Host ""
Write-Host "Para iniciar o sistema em produção (após build):"
Write-Host "  yarn build"
Write-Host "  yarn start"
Write-Host ""
Write-Host "IMPORTANTE: Se ocorrerem erros ao iniciar o sistema,"
Write-Host "contate o suporte técnico para assistência."
Write-Host "========================================================"