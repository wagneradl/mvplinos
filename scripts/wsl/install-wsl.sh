#!/bin/bash

# Definir o diretório de trabalho para o backend
BACKEND_DIR="packages/backend"

# Função para exibir mensagens de erro
error_exit() {
    echo "Erro: $1" >&2
    exit 1
}

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

# Gerar cliente Prisma
echo "Gerando cliente Prisma..."
npx prisma generate || error_exit "Falha ao gerar cliente Prisma"

# Aplicar migrações
echo "Aplicando migrações do banco de dados..."
npx prisma migrate deploy || error_exit "Falha ao aplicar migrações"

# Verificar se o banco de dados foi criado
DB_PATH="./dev.db"
if [ ! -s "$DB_PATH" ]; then
    # Tentar criar o banco de dados manualmente se estiver vazio
    sqlite3 "$DB_PATH" ".databases" || error_exit "Falha ao verificar/criar banco de dados SQLite"
fi

echo "Instalação do backend concluída com sucesso!"

# Retornar ao diretório raiz
cd ../..

# Instalar dependências do frontend
echo "Instalando dependências do frontend..."
cd packages/frontend
yarn install || error_exit "Falha ao instalar dependências do frontend"

echo "Instalação completa do sistema Lino's Panificadora!"

# Listar conteúdo do banco de dados para debug
echo "Conteúdo do banco de dados:"
sqlite3 "$BACKEND_DIR/dev.db" ".tables"
