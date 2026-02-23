# Lino's Panificadora

Sistema de gestao B2B para a Lino's Panificadora. Gerencia produtos, clientes, pedidos e gera PDFs/relatorios de vendas.

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router), React 18, MUI 5, React Query 5 |
| Backend | NestJS 10, Prisma 5 (SQLite), Passport + JWT |
| PDF | Puppeteer 22 |
| Email | Resend |
| Monorepo | Yarn Workspaces + Turborepo |
| Testes | Jest 29, Testing Library, Supertest |
| Deploy | Render.com (auto-deploy on push to main) |

## Estrutura do Monorepo

```
packages/
  backend/    NestJS REST API + Prisma ORM (SQLite)
  frontend/   Next.js 15 App Router + MUI + React Query
  shared/     Tipos TypeScript compartilhados
```

### Modulos do Backend (`packages/backend/src/`)

| Modulo | Descricao |
|--------|-----------|
| `auth/` | Autenticacao JWT + Passport, refresh tokens, reset de senha |
| `usuarios/` | CRUD de usuarios com papeis (Papel) e permissoes |
| `clientes/` | Gestao de clientes B2B (CNPJ, razao social) |
| `produtos/` | Gestao de produtos com precos e tipo de medida |
| `pedidos/` | Processamento de pedidos com geracao de PDF |
| `pdf/` | Geracao de PDF via Puppeteer |
| `email/` | Envio de emails via Resend |
| `admin/` | Endpoints administrativos (seed, reset, limpeza) |
| `health/` | Health check |

### Paginas do Frontend (`packages/frontend/src/app/`)

`login/` | `clientes/` | `produtos/` | `pedidos/` | `relatorios/`

## Setup Local

### Pre-requisitos

- Node.js >= 20
- Yarn 1.x (`npm install -g yarn`)

### Instalacao

```bash
# 1. Clonar e instalar dependencias
git clone <repo-url>
cd MVP7
yarn install

# 2. Configurar variaveis de ambiente
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env.local
# Editar packages/backend/.env — no minimo definir JWT_SECRET

# 3. Gerar Prisma client e aplicar migrations
cd packages/backend
npx prisma generate
npx prisma migrate deploy

# 4. Seed do banco (cria usuarios e dados iniciais)
yarn build
yarn seed
cd ../..

# 5. Iniciar em modo desenvolvimento
yarn dev
```

O backend roda em `http://localhost:3001` e o frontend em `http://localhost:3000`.

Swagger (documentacao da API): `http://localhost:3001/api`

## Comandos

```bash
# Desenvolvimento
yarn dev                    # Frontend + Backend simultaneamente
yarn build                  # Build de todos os pacotes
yarn start:prod             # Producao: build + check-db + start

# Testes
yarn test                   # Todos os testes (backend + frontend)
yarn workspace @linos/backend test              # Testes backend
yarn workspace @linos/backend test src/path     # Teste unico
yarn workspace @linos/frontend test             # Testes frontend

# Lint / Format
yarn lint
yarn format

# Banco de Dados (de packages/backend/)
npx prisma generate         # Gerar Prisma client
npx prisma migrate deploy   # Aplicar migrations
npx prisma studio           # GUI do banco
yarn seed                   # Popular banco (requer build)

# Backup
yarn backup                 # Criar backup
yarn backup:verify          # Verificar integridade
yarn backup:restore         # Restaurar
```

## Entidades do Banco

```
Usuario ──> Papel (papel_id)
         ──> RefreshToken[]
         ──> PasswordResetToken[]

Cliente ──> Pedido[]

Pedido  ──> ItemPedido[] ──> Produto
        ──> Cliente (cliente_id)
```

| Entidade | Campos principais |
|----------|------------------|
| `Usuario` | nome, email, senha (hash), status, papel_id |
| `Papel` | nome, codigo, tipo, nivel, permissoes (JSON) |
| `Cliente` | cnpj, razao_social, nome_fantasia, email, telefone |
| `Produto` | nome, preco_unitario, tipo_medida, status |
| `Pedido` | cliente_id, valor_total, status, pdf_path, pdf_url, observacoes |
| `ItemPedido` | pedido_id, produto_id, quantidade, preco_unitario, valor_total_item |

## Variaveis de Ambiente

### Backend (`packages/backend/.env`)

| Variavel | Obrigatoria | Descricao |
|----------|:-----------:|-----------|
| `DATABASE_URL` | sim | Conexao SQLite (padrao: `file:./prisma/dev.db`) |
| `JWT_SECRET` | sim | Chave secreta para tokens JWT |
| `JWT_EXPIRATION` | | Expiracao do access token (padrao: `15m`) |
| `REFRESH_TOKEN_EXPIRATION_HOURS` | | Expiracao do refresh token em horas (padrao: `24`) |
| `PORT` | | Porta do servidor (padrao: `3001`) |
| `NODE_ENV` | | `development` ou `production` |
| `RESEND_API_KEY` | prod | Chave da API Resend para envio de emails |
| `EMAIL_FROM` | | Remetente dos emails |
| `EMAIL_MOCK` | | `true` para logar emails no console (dev) |
| `FRONTEND_URL` | | URL do frontend para links em emails |
| `SUPABASE_URL` | | URL do projeto Supabase (storage de PDFs) |
| `SUPABASE_SERVICE_ROLE_KEY` | | Chave de servico do Supabase |
| `SUPABASE_BUCKET` | | Nome do bucket (padrao: `pedidos-pdfs`) |
| `THROTTLE_LOGIN_LIMIT` | | Limite de tentativas de login por IP (padrao: `5`) |
| `THROTTLE_LOGIN_TTL` | | Janela do rate limit em segundos (padrao: `60`) |
| `CORS_ORIGINS` | prod | Origens permitidas separadas por virgula |

### Frontend (`packages/frontend/.env.local`)

| Variavel | Descricao |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da API backend (padrao: `http://localhost:3001`) |

## Deploy

O projeto roda em **Render.com** com auto-deploy no push para `main`.

A configuracao esta em `render.yaml`:
- **Backend**: Web Service (Node.js) com disco persistente de 2 GB para SQLite
- **Frontend**: Web Service (Node.js) com Next.js

O banco SQLite fica em `/var/data/linos-panificadora.db` (disco persistente do Render).

PDFs podem ser armazenados localmente ou no Supabase Storage (configuravel via env vars).

---

Desenvolvido por **Logos AI Solutions** — 2025
