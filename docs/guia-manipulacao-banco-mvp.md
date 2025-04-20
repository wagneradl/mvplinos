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

## 3. Produtos e Clientes

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

## 4. Rodar o Seed Manualmente

Se precisar rodar o seed manualmente (por exemplo, após apagar usuários):

```sh
yarn --cwd /opt/render/project/src/packages/backend run seed
```
Ou, localmente:
```sh
yarn --cwd packages/backend run seed
```

---

## 5. Conferir Hash da Senha

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

## 6. Dicas e Segurança
- Sempre faça backup do banco antes de operações em massa:
  ```sh
  cp /var/data/linos-panificadora.db /var/data/linos-panificadora.db.bkp
  ```
- Para desfazer um erro, restaure o backup:
  ```sh
  cp /var/data/linos-panificadora.db.bkp /var/data/linos-panificadora.db
  ```
- Use sempre senhas fortes e gere o hash com bcrypt.

---

## 7. Recomendações de Segurança
- Nunca exponha senhas em texto plano em produção.
- Sempre utilize variáveis de ambiente para credenciais.
- Centralize a lógica de seed em um único script seguro.
- Evite scripts de bootstrap que sobrescrevam usuários automaticamente em produção.

---

## 8. Referências rápidas
- [Documentação SQLite](https://www.sqlite.org/cli.html)
- [bcrypt online hash generator](https://bcrypt-generator.com/)

---

**Este documento pode ser expandido conforme surgirem novas necessidades!**
