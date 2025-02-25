#!/bin/bash
# Tornar o script executável: chmod +x setup.sh

# setup.sh - Script de instalação e configuração do Sistema Lino's Panificadora

echo "========================================================"
echo "      Instalação do Sistema Lino's Panificadora         "
echo "========================================================"

# Verificar Node.js
NODE_VERSION=$(node -v)
echo "Versão do Node.js: $NODE_VERSION"
if [[ ! $NODE_VERSION =~ ^v20 ]]; then
  echo "AVISO: Recomendado Node.js v20.x LTS. Versão atual: $NODE_VERSION"
fi

# Instalar dependências
echo -e "\n[1/7] Instalando dependências..."
yarn install

# Gerar cliente Prisma
echo -e "\n[2/7] Gerando cliente Prisma..."
npx prisma generate

# Verificar/criar estrutura do banco de dados
echo -e "\n[3/7] Configurando banco de dados..."
npx prisma migrate deploy

# Criar diretórios necessários
echo -e "\n[4/7] Criando diretórios para uploads..."
mkdir -p uploads/pdfs uploads/static

# Copiar logo para diretório estático (se existir)
if [ -f "Linos.png" ]; then
  echo -e "\n[5/7] Copiando logo para diretório estático..."
  cp Linos.png uploads/static/logo.png
else
  echo -e "\n[5/7] AVISO: Arquivo de logo (Linos.png) não encontrado."
  echo "Você precisará adicionar manualmente um arquivo logo.png em uploads/static/"
fi

# Verificar permissões
echo -e "\n[6/7] Configurando permissões..."
chmod -R 755 uploads

# Configurar dados iniciais (opcional)
echo -e "\n[7/7] Deseja inserir dados iniciais no banco de dados? (s/n)"
read INSERIR_DADOS

if [[ $INSERIR_DADOS == "s" || $INSERIR_DADOS == "S" ]]; then
  echo "Inserindo dados iniciais..."
  
  # Criar arquivo SQL temporário
  cat > ./dados_iniciais.sql << EOL
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
EOL

  # Executar SQL
  npx prisma db execute --file=./dados_iniciais.sql
  
  # Remover arquivo temporário
  rm ./dados_iniciais.sql
fi

echo -e "\n========================================================"
echo "      Instalação concluída com sucesso!                  "
echo "========================================================"
echo ""
echo "Para iniciar o sistema em modo desenvolvimento:"
echo "  yarn dev"
echo ""
echo "Para iniciar o sistema em produção (após build):"
echo "  yarn build"
echo "  yarn start"
echo ""
echo "IMPORTANTE: Se ocorrerem erros ao iniciar o sistema,"
echo "contate o suporte técnico para assistência."
echo "========================================================"