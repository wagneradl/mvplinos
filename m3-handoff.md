# 🔄 HANDOFF — M3 Portal Cliente

**Data:** 2026-02-23
**Sessão anterior:** Diagnóstico M3 + Decisões Arquiteturais
**Status:** Diagnóstico COMPLETO, decisões CONFIRMADAS, implementação NÃO INICIADA
**Memory Cloud:** Projeto `linos-panificadora` atualizado com resultados diagnóstico

---

## 1. CONTEXTO RÁPIDO

Sistema Lino's Panificadora — gestão de pedidos B2B (NestJS + Next.js + Prisma/SQLite).

**Milestones concluídos:**
- ✅ M1 Fundação (email, rate limiting, refresh token) — 211 testes
- ✅ M2 Segurança (UI usuários, papéis, reset senha, vínculo Usuário↔Cliente) — 222 testes

**Milestone atual:** M3 Portal Cliente F1
**Repo local:** `~/Projetos/mvplinos` (monorepo Yarn Workspaces + Turborepo)
**Branch:** `main`

---

## 2. DIAGNÓSTICO M3 — RESUMO EXECUTIVO

### 2.1 Backend: O que existe vs. o que falta

| Módulo | Existe | Falta |
|--------|--------|-------|
| **Pedidos** | 4 estados (PENDENTE/ATIVO/ATUALIZADO/CANCELADO), CRUD completo, PDF | 6 estados (+CONFIRMADO/PRODUCAO/SAIU_ENTREGA/ENTREGUE), state machine, `created_by` field |
| **Clientes** | CRUD + CNPJ validado, soft-delete | Auto-cadastro público, status `pendente_aprovacao`, fluxo de aprovação |
| **Produtos** | CRUD + filtros completos | Endpoint público/catálogo readonly |
| **Auth/JWT** | Login, RBAC 7 papéis, refresh token | `cliente_id` NO JWT, TenantGuard, ownership filtering |

### 2.2 Frontend: O que existe vs. o que falta

| Área | Existe | Falta |
|------|--------|-------|
| **Routing** | Flat structure, 2 layouts (root + login) | Route groups `/(admin)/` e `/(portal)/` |
| **Navigation** | Sidebar fixa estática | Dynamic nav por `papel.tipo`, post-login redirect |
| **Pedidos UI** | Form completo, status chips (4 cores) | 6-color chips, transition buttons, timeline/stepper |
| **Produtos UI** | CRUD admin only | Catálogo readonly para portal |

### 2.3 🔴 RISCO CRÍTICO: Tenant Isolation

**Problema:** `cliente_id` NÃO está no JWT payload. Não existe tenant middleware, guard ou interceptor. Filtro por `cliente_id` é query param opcional (client-controlled).

**Consequência:** CLIENTE_ADMIN pode ver TODOS os pedidos de TODOS os clientes.

**Resolução:** F0.1 (primeiro prompt de implementação) — adicionar `cliente_id` ao JWT + criar TenantGuard.

---

## 3. DECISÕES ARQUITETURAIS CONFIRMADAS

Todas as 5 decisões foram confirmadas pelo Wagner:

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| C1 | Arquitetura Portal | **Route Groups** `/(admin)/` + `/(portal)/` | Zero duplicação, deploy único, layouts isolados |
| C2 | Ownership Filtering | **Guard + Service hybrid** | `cliente_id` no JWT → TenantGuard injeta `req.clienteId` → services filtram |
| C3 | State Machine | **Mapa de transições simples** | 6 estados + ~8 transições = objeto `TRANSICOES_VALIDAS`, testável, importável |
| C4 | Auto-cadastro | **Público com aprovação** | POST /auth/registrar-cliente, status `pendente_aprovacao`, defesas já existem (rate limit, CNPJ, email) |
| C5 | Campo `created_by` | **Incluir no M3** | Migration simples (1 campo nullable FK), essencial para auditoria |

---

## 4. ROADMAP DE IMPLEMENTAÇÃO

### Fase 0 — Foundation (prerequisito) — ~4 prompts

| Prompt | Escopo | Detalhes |
|--------|--------|----------|
| **P43-P44** | cliente_id no JWT + TenantGuard + ownership filtering | Modificar JwtStrategy para incluir `cliente_id` do usuário. Criar `TenantGuard` que injeta `req.clienteId` para roles CLIENTE_*. Modificar services (pedidos, clientes) para filtrar por `clienteId` quando presente. Ownership check em `findOne()`. Adicionar `created_by` (usuario_id FK) no modelo Pedido. Testes de isolamento. |
| **P45** | Route groups + layouts | Criar `/(admin)/` (mover rotas existentes) e `/(portal)/` (novo layout). Layout admin = sidebar atual. Layout portal = sidebar simplificada para clientes. |
| **P46** | Dynamic navigation + redirect | Sidebar condicional por `papel.tipo` (INTERNO vs CLIENTE). Post-login redirect: interno → dashboard admin, cliente → dashboard portal. |

### Fase 1 — Status Expandido — ~2 prompts

| Prompt | Escopo |
|--------|--------|
| **P47** | Backend: enum 6 estados, `TRANSICOES_VALIDAS` map, `atualizarStatus()` com validação, testes |
| **P48** | Frontend: 6-color chips, botões de transição por estado, filtros expandidos, timeline/stepper |

### Fase 2 — Auto-cadastro — ~4 prompts

| Prompt | Escopo |
|--------|--------|
| **P49** | Backend: campo `pendente_aprovacao` em Cliente, POST /auth/registrar-cliente (público), criação automática de Usuario vinculado |
| **P50** | Frontend: página pública de registro (CNPJ, dados empresa, dados responsável) |
| **P51** | Admin: tela de aprovação/rejeição, email de notificação (aprovado/rejeitado) |
| **P52** | Testes e2e do fluxo completo (registro → aprovação → login) |

### Fase 3 — Portal do Cliente — ~4 prompts

| Prompt | Escopo |
|--------|--------|
| **P53** | Catálogo readonly em `/(portal)/catalogo` — grid de produtos ativos, sem CRUD |
| **P54** | Meus Pedidos: listagem filtrada por ownership + página de criação simplificada |
| **P55** | Detalhe do pedido: timeline de status, itens, observações, download PDF |
| **P56** | Testes de tenant isolation end-to-end (cliente A não vê dados de cliente B) |

### Dependências

```
F0 (Foundation) ──→ bloqueia F2 (Auto-cadastro) e F3 (Portal)
F1 (Status)     ──→ independente (pode paralelizar com F0)
F2              ──→ precisa de F0 (route groups para página de registro)
F3              ──→ precisa de F0 + F1 (ownership + status expandido)
```

**Ordem recomendada:** F0 → F1 → F2 → F3

---

## 5. RISCOS TÉCNICOS

| Risco | Nível | Ação |
|-------|-------|------|
| **Tenant Security** | 🔴 ALTO | Resolver em F0.1 (ANTES de qualquer portal) |
| **SQLite Concurrency** | ⚠️ MÉDIO | Aceitável com <50 clientes + WAL mode. PostgreSQL planejado para M4/M5 |
| **Rate Limiting Portal** | ⚠️ MÉDIO | Configurar per-route: registro 3/15min, catálogo 60/min, pedidos 10/min |
| **Puppeteer + Portal** | 🟢 BAIXO | PDFs 1:1 por pedido, portal não muda volume. Sem ação necessária |

---

## 6. INSTRUÇÕES PARA PRÓXIMA SESSÃO

### Passo 1: Orientação
```
Leia o Memory Cloud (projeto linos-panificadora) e o handoff document
para contexto completo do M3 Portal Cliente.
```

### Passo 2: Verificar estado do repo
```bash
cd ~/Projetos/mvplinos
git status
git log --oneline -5
cd apps/backend && npx jest --passWithNoTests 2>&1 | tail -5
```

### Passo 3: Iniciar F0.1
Começar implementação pelo prompt P43 — `cliente_id` no JWT + TenantGuard.

**Arquivos-chave a modificar:**
- `apps/backend/src/auth/strategies/jwt.strategy.ts` — incluir `cliente_id` no payload
- `apps/backend/src/auth/guards/` — criar `tenant.guard.ts`
- `apps/backend/src/pedidos/pedidos.service.ts` — filtrar por `clienteId`
- `apps/backend/prisma/schema.prisma` — adicionar `created_by` (usuario_id) em Pedido

### Passo 4: Gate check após F0
Após completar F0 (P43-P46), validar:
- [ ] JWT contém `cliente_id` para usuários CLIENTE_*
- [ ] TenantGuard bloqueia acesso cross-tenant
- [ ] Route groups funcionam (/(admin)/ e /(portal)/)
- [ ] Navigation dinâmica por tipo de papel
- [ ] Redirect pós-login correto
- [ ] Todos os testes passando (≥222)

---

## 7. REFERÊNCIAS

- **Transcrição completa:** `/mnt/transcripts/2026-02-23-15-24-51-m3-diagnostic-complete-decisions.txt`
- **Memory Cloud:** Projeto `linos-panificadora` — entidades M3, Ownership/Tenant, Frontend Admin atualizadas
- **Repo:** `~/Projetos/mvplinos` (branch main)
- **ADRs relevantes:** ADR-004 (SQLite→PostgreSQL), ADR-006 (Observabilidade) — triggers antes de M3 produção
