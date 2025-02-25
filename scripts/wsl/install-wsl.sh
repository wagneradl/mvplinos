#!/bin/bash

# Função para exibir mensagens de erro
error_exit() {
    echo "Erro: $1" >&2
    exit 1
}

# Função para instalar dependências do sistema
install_system_deps() {
    echo "Instalando dependências do sistema..."
    
    # Tentar identificar o gerenciador de pacotes
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y sqlite3 build-essential curl
    elif command -v yum &> /dev/null; then
        sudo yum install -y sqlite sqlite-devel gcc-c++ make
    elif command -v brew &> /dev/null; then
        brew install sqlite
    else
        error_exit "Nenhum gerenciador de pacotes compatível encontrado. Instale sqlite3 manualmente."
    fi
}

# Instalar Node.js e Yarn se não estiverem instalados
install_node_yarn() {
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
        sudo apt-get install -y nodejs
    fi

    # Verificar Yarn
    if ! command -v yarn &> /dev/null; then
        echo "Instalando Yarn..."
        npm install -g yarn
    fi
}

# Verificar e instalar dependências
install_system_deps
install_node_yarn

# Definir o diretório de trabalho para o backend
BACKEND_DIR="packages/backend"

# Verificar se está no diretório correto
if [ ! -d "$BACKEND_DIR" ]; then
    error_exit "Diretório backend não encontrado. Certifique-se de estar no diretório raiz do projeto."
fi

# Navegar para o diretório backend
cd "$BACKEND_DIR" || error_exit "Não foi possível navegar para o diretório backend"

# Criar arquivo .env se não existir
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Criando arquivo .env..."
    
    # Caminho para o banco de dados SQLite
    DB_PATH="./dev.db"
    
    # Criar conteúdo do .env
    cat > "$ENV_FILE" << EOL
# Configuração do banco de dados para desenvolvimento
DATABASE_URL="file:${DB_PATH}"

# Outras configurações de ambiente, se necessário
NODE_ENV=development
PORT=3001
EOL

    echo "Arquivo .env criado com sucesso."
fi

# Verificar se o arquivo .env foi criado corretamente
if [ ! -f "$ENV_FILE" ]; then
    error_exit "Falha ao criar o arquivo .env"
fi

# Instalar dependências do backend
echo "Instalando dependências do backend..."
yarn install || error_exit "Falha ao instalar dependências"

# Atualizar Prisma para a última versão
echo "Atualizando Prisma..."
yarn add prisma@latest @prisma/client@latest || error_exit "Falha ao atualizar Prisma"

# Gerar cliente Prisma
echo "Gerando cliente Prisma..."
npx prisma generate || error_exit "Falha ao gerar cliente Prisma"

# Aplicar migrações
echo "Aplicando migrações do banco de dados..."
npx prisma migrate deploy || error_exit "Falha ao aplicar migrações"

# Verificar banco de dados
DB_PATH="./dev.db"
if [ ! -s "$DB_PATH" ]; then
    echo "Criando banco de dados SQLite..."
    sqlite3 "$DB_PATH" "SELECT 'Banco de dados criado com sucesso'" || error_exit "Falha ao criar banco de dados SQLite"
fi

echo "Instalação do backend concluída com sucesso!"

# Retornar ao diretório raiz
cd ../..

# Instalar dependências do frontend
echo "Instalando dependências do frontend..."
cd packages/frontend
yarn install || error_exit "Falha ao instalar dependências do frontend"

echo "Instalação completa do sistema Lino's Panificadora!"

# Gerar relatório de status
echo "Gerando relatório de instalação..."
{
    echo "=== Relatório de Instalação ==="
    echo "Data: $(date)"
    echo "Node.js: $(node --version)"
    echo "Yarn: $(yarn --version)"
    echo "Prisma: $(npx prisma --version)"
    echo "SQLite: $(sqlite3 --version)"
    echo "=== Fim do Relatório ==="
} > ../wsl-installation-report.txt

# Mostrar relatório
cat ../wsl-installation-report.txt
