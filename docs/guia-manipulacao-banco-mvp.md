# Guia de Manipulação Manual do Banco de Dados (MVP)

Este guia é um apoio prático para operações manuais frequentes no banco de dados do Lino's Panificadora durante a etapa de MVP. Use-o sempre que precisar ajustar usuários, senhas, produtos, clientes ou popular dados via terminal.

---

## 1. Acessando o banco SQLite

O banco principal está em:
```
/var/data/linos-panificadora.db
```
Abra o shell no Render e use:
```
sqlite3 /var/data/linos-panificadora.db
```
Ou execute comandos SQL diretamente:
```
sqlite3 /var/data/linos-panificadora.db "<COMANDO_SQL>"
```

---

## 2. Usuários e Senhas

### Listar todos os usuários
```sh
sqlite3 /var/data/linos-panificadora.db "SELECT id, nome, email, papel_id, status FROM Usuario;"
```

### Alterar senha de um usuário (exemplo para admin)
1. Gere o hash da nova senha (use bcrypt online ou localmente):
   - Exemplo em Node.js:
     ```js
     const bcrypt = require('bcryptjs');
     bcrypt.hashSync('SENHA_NOVA', 10);
     ```
2. Atualize o hash no banco:
   ```sh
   sqlite3 /var/data/linos-panificadora.db "UPDATE Usuario SET senha = 'NOVO_HASH' WHERE email = 'admin@linos.com';"
   ```

### Criar novo usuário com papel específico
- Descubra o id do papel desejado:
  ```sh
  sqlite3 /var/data/linos-panificadora.db "SELECT id, nome FROM Papel;"
  ```
- Crie o usuário:
  ```sh
  sqlite3 /var/data/linos-panificadora.db "INSERT INTO Usuario (nome, email, senha, papel_id, status, created_at, updated_at) VALUES ('NOME', 'EMAIL', 'HASH_SENHA', PAPEL_ID, 'ativo', datetime('now'), datetime('now'));"
  ```

### Apagar Usuários Manualmente

#### Apagar todos os usuários:
```sh
sqlite3 /var/data/linos-panificadora.db "DELETE FROM Usuario;"
```

#### Apagar apenas admin e operador:
```sh
sqlite3 /var/data/linos-panificadora.db "DELETE FROM Usuario WHERE email IN ('admin@linos.com', 'operador@linos.com');"
```

#### Apagar todos exceto admin e operador:
```sh
sqlite3 /var/data/linos-panificadora.db "DELETE FROM Usuario WHERE email NOT IN ('admin@linos.com', 'operador@linos.com');"
```

> **Dica:** Após apagar usuários, rode o seed do backend para recriá-los com as senhas das variáveis de ambiente.

---

## 3. Endpoints de Administração (Recomendado)

O sistema agora conta com endpoints de administração que facilitam a manutenção do banco de dados sem precisar acessar o terminal. Esta é a forma **recomendada** para realizar manutenção no banco.

### Pré-requisitos

Para usar os endpoints de administração, você precisa:

1. Estar autenticado como um usuário com permissões de administrador
2. Ter um token JWT válido

### Obter o Token de Autenticação

1. Faça login no sistema usando as credenciais de administrador:

```bash
curl -X POST https://linos-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@linos.com", "senha": "sua-senha-admin"}'
```

2. A resposta incluirá um token JWT:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 13,
    "nome": "Administrador",
    "email": "admin@linos.com",
    "papel": {
      "id": 1,
      "nome": "Administrador",
      "permissoes": {...}
    }
  }
}
```

3. Copie o valor do token para usar nas próximas requisições

### Endpoint 1: Executar Seed

Este endpoint atualiza os usuários admin e operador com as senhas definidas nas variáveis de ambiente.

#### Usando curl:

```bash
curl -X POST https://linos-backend.onrender.com/admin/seed \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

#### Usando Postman ou outra ferramenta:

- **Método**: POST
- **URL**: https://linos-backend.onrender.com/admin/seed
- **Headers**:
  - Authorization: Bearer SEU_TOKEN_JWT
  - Content-Type: application/json

#### Resposta esperada:

```json
{
  "success": true,
  "message": "Seed executado com sucesso",
  "timestamp": "2025-04-20T03:52:10.123Z"
}
```

### Endpoint 2: Resetar Banco de Dados

Este endpoint remove todos os usuários não essenciais (exceto admin e operador) e atualiza os usuários admin e operador com as senhas definidas nas variáveis de ambiente.

#### Usando curl:

```bash
curl -X POST https://linos-backend.onrender.com/admin/reset-database \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

#### Usando Postman ou outra ferramenta:

- **Método**: POST
- **URL**: https://linos-backend.onrender.com/admin/reset-database
- **Headers**:
  - Authorization: Bearer SEU_TOKEN_JWT
  - Content-Type: application/json

#### Resposta esperada:

```json
{
  "success": true,
  "message": "Banco de dados resetado com sucesso",
  "timestamp": "2025-04-20T03:52:15.456Z"
}
```

### Endpoint 3: Limpar Dados de Teste

Este endpoint remove todos os produtos, pedidos e clientes cadastrados para testes, mantendo apenas os usuários padrões (admin e operador) com suas senhas atualizadas conforme as variáveis de ambiente.

#### Usando curl:

```bash
curl -X POST https://linos-backend.onrender.com/admin/clean-test-data \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

#### Usando Postman ou outra ferramenta:

- **Método**: POST
- **URL**: https://linos-backend.onrender.com/admin/clean-test-data
- **Headers**:
  - Authorization: Bearer SEU_TOKEN_JWT
  - Content-Type: application/json

#### Resposta esperada:

```json
{
  "success": true,
  "message": "Dados de teste removidos com sucesso. Usuários padrões mantidos.",
  "details": {
    "usuariosPreservados": ["admin@linos.com", "operador@linos.com"],
    "dadosRemovidos": ["ItemPedido", "Pedido", "Produto", "Cliente"]
  },
  "timestamp": "2025-04-20T04:00:10.789Z"
}
```

### Script de Manutenção Rápida

Você pode criar um script shell para facilitar a manutenção:

```bash
#!/bin/bash

# URL do backend
BACKEND_URL="https://linos-backend.onrender.com"

# Credenciais de admin
ADMIN_EMAIL="admin@linos.com"
ADMIN_PASSWORD="sua-senha-admin"

# Obter token JWT
echo "Obtendo token de autenticação..."
TOKEN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"senha\": \"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "Falha ao obter token. Verifique as credenciais."
  exit 1
fi

echo "Token obtido com sucesso."

# Menu de opções
echo "Selecione a operação:"
echo "1. Executar seed (atualizar usuários admin e operador)"
echo "2. Resetar banco de dados (remover usuários não essenciais)"
echo "3. Limpar dados de teste (remover produtos, pedidos e clientes)"
read -p "Opção: " OPTION

case $OPTION in
  1)
    echo "Executando seed..."
    curl -s -X POST "$BACKEND_URL/admin/seed" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
    ;;
  2)
    echo "Resetando banco de dados..."
    curl -s -X POST "$BACKEND_URL/admin/reset-database" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
    ;;
  3)
    echo "Limpando dados de teste..."
    curl -s -X POST "$BACKEND_URL/admin/clean-test-data" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
    ;;
  *)
    echo "Opção inválida."
    exit 1
    ;;
esac

echo "Operação concluída."
```

---

## 4. Produtos e Clientes

### Listar produtos/clientes
```sh
sqlite3 /var/data/linos-panificadora.db "SELECT * FROM Produto;"
sqlite3 /var/data/linos-panificadora.db "SELECT * FROM Cliente;"
```

### Inserir produto/cliente manualmente
```sh
sqlite3 /var/data/linos-panificadora.db "INSERT INTO Produto (nome, preco_unitario, tipo_medida, status, created_at, updated_at) VALUES ('Pão Francês', 9.99, 'kg', 'ativo', datetime('now'), datetime('now'));"
```

### Importar dados de planilha (CSV)
1. Prepare o arquivo CSV (exemplo: produtos.csv) com colunas na ordem correta.
2. No shell do sqlite3:
   ```sh
   sqlite3 /var/data/linos-panificadora.db
   .mode csv
   .import produtos.csv Produto
   .import clientes.csv Cliente
   .quit
   ```
   - **Atenção:** O cabeçalho do CSV deve bater exatamente com as colunas da tabela.

---

## 5. Rodar o Seed Manualmente

Se precisar rodar o seed manualmente (por exemplo, após apagar usuários):

```sh
cd /opt/render/project/src/packages/backend
node dist/scripts/seed.js
```
Ou, localmente:
```sh
cd packages/backend
yarn seed
```

> **Nota:** O script de seed foi atualizado para sempre atualizar as senhas dos usuários admin e operador conforme as variáveis de ambiente, mesmo que eles já existam no banco.

---

## 6. Conferir Hash da Senha

Para conferir o hash salvo de um usuário:
```sh
sqlite3 /var/data/linos-panificadora.db "SELECT email, senha FROM Usuario WHERE email = 'admin@linos.com';"
```

Você pode validar o hash usando Node.js localmente:
```js
const bcrypt = require('bcryptjs');
bcrypt.compareSync('SENHA_PLAINTEXT', 'HASH_DO_BANCO');
```

---

## 7. Troubleshooting Comum

### Problema: Login não funciona após atualização de senha

Verifique:
1. Se o status do usuário está como 'ativo' (case-insensitive):
   ```sh
   sqlite3 /var/data/linos-panificadora.db "SELECT email, status FROM Usuario WHERE email = 'admin@linos.com';"
   ```
   
2. Se o hash da senha está correto:
   ```sh
   sqlite3 /var/data/linos-panificadora.db "SELECT email, senha FROM Usuario WHERE email = 'admin@linos.com';"
   ```

3. Se as variáveis de ambiente estão configuradas corretamente no Render:
   - ADMIN_PASSWORD
   - OPERADOR_PASSWORD

### Problema: Seed não atualiza usuários existentes

O script de seed foi atualizado para sempre atualizar os usuários existentes. Se ainda houver problemas:

1. Verifique os logs do Render para confirmar que o seed está sendo executado
2. Use o endpoint `/admin/seed` para forçar a atualização
3. Em último caso, remova os usuários manualmente e execute o seed novamente

---

## 8. Dicas e Segurança
- Sempre faça backup do banco antes de operações em massa:
  ```sh
  cp /var/data/linos-panificadora.db /var/data/linos-panificadora.db.bkp
  ```
- Para desfazer um erro, restaure o backup:
  ```sh
  cp /var/data/linos-panificadora.db.bkp /var/data/linos-panificadora.db
  ```
- Use sempre senhas fortes e gere o hash com bcrypt.
- Prefira usar os endpoints de administração em vez de manipular o banco diretamente.

---

## 9. Recomendações de Segurança
- Nunca exponha senhas em texto plano em produção.
- Sempre utilize variáveis de ambiente para credenciais.
- Centralize a lógica de seed em um único script seguro.
- Evite scripts de bootstrap que sobrescrevam usuários automaticamente em produção.
- Utilize os endpoints de administração protegidos por autenticação para manutenção.

---

## 10. Referências rápidas
- [Documentação SQLite](https://www.sqlite.org/cli.html)
- [bcrypt online hash generator](https://bcrypt-generator.com/)
- [Documentação NestJS](https://docs.nestjs.com/)
- [Documentação Prisma](https://www.prisma.io/docs/)

---

**Este documento pode ser expandido conforme surgirem novas necessidades!**
