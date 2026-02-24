# P66 — Preparação Deploy Render: Variáveis e Ajustes

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Branch: main. 396 testes (commit `debc6ac`). Tag `m4-portal-cliente-f2`.

**Objetivo:** Preparar o código para deploy funcional no Render. Ajustar `render.yaml` com variáveis de ambiente faltantes e commitar arquivos pendentes. Após este prompt, Wagner faz `git push` e configura segredos no dashboard do Render.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
```

## TAREFA 1 — Ajustar render.yaml

### 1.1 Adicionar variáveis faltantes ao backend

Adicionar no bloco `envVars` do backend (service `linos-backend`), após as variáveis existentes:

```yaml
      # Email
      - key: EMAIL_MOCK
        value: "true"
      - key: EMAIL_FROM
        value: "Lino's Panificadora <noreply@resend.dev>"
      - key: FRONTEND_URL
        value: "https://linos-frontend.onrender.com"
      # PDF
      - key: PDF_MOCK
        value: "true"
      # Admin seed (credenciais para criação do admin no primeiro deploy)
      - key: ADMIN_EMAIL
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
```

### 1.2 Adicionar RESEND_API_KEY ao grupo de secrets

No `envVarGroups.linos-secrets`, adicionar:

```yaml
      - key: RESEND_API_KEY
        sync: false
```

### 1.3 Verificar CORS_ORIGINS

Confirmar que o `CORS_ORIGINS` inclui todas as URLs necessárias. O valor atual deve conter pelo menos:
- `https://linos-frontend-6wef.onrender.com` (URL real do frontend no Render)
- `https://linos-frontend.onrender.com`
- `http://localhost:3000` (dev)

## TAREFA 2 — Verificar Frontend API URL

### 2.1 Confirmar configuração

Em `packages/frontend`, verificar que o `NEXT_PUBLIC_API_URL` está configurado no render.yaml apontando para o backend correto.

### 2.2 Verificar se há hardcoded URLs

Buscar no código frontend por URLs hardcoded (`localhost:3001` ou similar) que deveriam usar a variável de ambiente. Se encontrar, substituir por `process.env.NEXT_PUBLIC_API_URL`.

## TAREFA 3 — Commitar Arquivos Pendentes

```bash
cd ~/Projetos/Linos/MVP7

# Verificar untracked
git status --short

# Commitar prompts (documentação de desenvolvimento)
git add prompts/
git add m4-handoff.md
git add render.yaml

git status

git commit -m "chore: prepare for Render deploy

- Add EMAIL_MOCK, PDF_MOCK, FRONTEND_URL to render.yaml
- Add ADMIN_EMAIL/PASSWORD as sync:false secrets
- Add RESEND_API_KEY to secrets group
- Commit M4 prompts and handoff docs

refs: deploy-prep"
```

## TAREFA 4 — Validação Final

```bash
# Build rápido para garantir que nada quebrou
yarn workspace backend build 2>&1 | tail -5
yarn workspace frontend build 2>&1 | tail -5

# Testes rápidos
yarn workspace backend test --no-coverage 2>&1 | tail -5
```

## NÃO FAZER

- NÃO fazer `git push` — Wagner faz manualmente
- NÃO alterar lógica de negócio
- NÃO instalar dependências novas
- NÃO criar conta em serviços externos
