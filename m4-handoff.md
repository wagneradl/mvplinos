# M4 Portal Cliente F2 — Handoff Document

**Data:** 2026-02-24
**Autor:** Sessão Claude (pós-M3)
**Próximo milestone:** M4 Portal Cliente F2
**Memory Cloud:** `linos-panificadora` (verificado e consolidado nesta data)

---

## 1. Estado do Sistema (pós-M3)

### Milestones Completos

| Milestone | Data | Testes | Tag/Commit |
|-----------|------|--------|------------|
| M1 Fundação | 2026-02-19 | 211 (11 suites) | — |
| M2 Segurança | 2026-02-22 | 222 (11 suites) | — |
| M3 Portal Cliente F1 | 2026-02-24 | 329 (14 suites) | `m3-portal-cliente` / `fd064fa` |

### Tier de Segurança Atual: **Tier 3 — Multi-Tenant Isolado**

- Tier 1 (Operação Interna) ✅
- Tier 2 (Exposição Controlada) ✅ — M1+M2
- Tier 3 (Multi-Tenant Isolado) ✅ — M3

### Componentes — Status

| Componente | Status | Notas |
|-----------|--------|-------|
| Módulo Auth | ~98% | Gap: JWT localStorage (não httpOnly), audit log ausente |
| Módulo Clientes | 100% MVP | Auto-cadastro + aprovação + status (ativo/pendente/rejeitado/suspenso) |
| Módulo Pedidos | 100% MVP | 7 estados + tenant isolation + portal cliente |
| Módulo Produtos | 100% MVP | CRUD completo, soft-delete |
| Módulo PDF | ~90% | Puppeteer, risco OOM em 512MB RAM (ADR-005) |
| Frontend Admin | Funcional | Route group `/(admin)/`, sidebar, proteção INTERNO |
| Portal Self-Service | ~70% | Funcional mas faltam entregas M4 |

---

## 2. O que M3 Entregou

### Backend
- **TenantGuard** — JWT payload inclui `clienteId` + `papelTipo`, guard injeta `req.clienteId`
- **7 estados pedido** — RASCUNHO→PENDENTE→CONFIRMADO→EM_PRODUCAO→PRONTO→ENTREGUE + CANCELADO
- **Mapa transições** — `packages/backend/src/pedidos/constants/transicoes-pedido.ts`
- **Auto-cadastro** — POST `/auth/registrar-cliente` (público), criação atômica Cliente+Usuario
- **Aprovação/rejeição** — PATCH `/clientes/:id/aprovar` e `/rejeitar`
- **created_by** — Int? FK em Pedido→Usuario (rastreabilidade)
- **Bloqueio login** — clientes pendentes/rejeitados/suspensos não fazem login

### Frontend
- **Route groups** — `/(admin)/` com sidebar, `/(portal)/` com header horizontal
- **Login redirect** dinâmico por papel (INTERNO→admin, CLIENTE→portal)
- **Portal completo** — `/portal/dashboard` (placeholder), `/portal/catalogo`, `/portal/pedidos`, `/portal/pedidos/novo`, `/portal/pedidos/[id]`
- **Status UI** — StatusChip (7 cores), TransitionButtons (contextuais), StatusTimeline (progress bar)
- **Aprovação admin** — banner pendentes, chips coloridos, filtro status, botões aprovar/rejeitar
- **Página /registrar** — formulário público com máscaras CNPJ/telefone

### Testes
- **329 testes**, 14 suites, zero falhas
- `pedidos.tenant.spec.ts` — 6 testes de isolamento cross-tenant
- Progressão: 222→241→281→301→329

---

## 3. Escopo M4 — Portal Cliente F2

**Estimativa:** 50-70 horas
**Previsão original:** Julho-Agosto 2026
**Dependência:** M3 ✅ (satisfeita)

### Entregas Planejadas

1. **Dashboard cliente com métricas reais** — hoje é placeholder em `/portal/dashboard`
2. **Notificações email de status** — pedido confirmado, pronto, entregue (fire-and-forget via EmailModule existente)
3. **Sub-usuários** — CLIENTE_ADMIN convida CLIENTE_USUARIO dentro do mesmo cliente
4. **Relatórios/PDFs para cliente** — histórico de pedidos, extratos
5. **Bloqueio edição pedido pós-confirmação** — hoje pedido pode ser editado em qualquer estado

### Recomendação de Sequência (a validar no diagnóstico)

A sessão M4 deve começar com um **diagnóstico de reconhecimento** (padrão P42/P33/P22) para:
- Verificar estado real do código após M3
- Identificar quick wins vs entregas complexas
- Priorizar entregas com base em valor para o cliente final
- Definir fases e prompts

---

## 4. ADRs Pendentes (Decisões Adiadas)

### ADR-004: SQLite → PostgreSQL
- **Trigger:** "Antes de M3 ir para produção" — **ATINGIDO**
- **Risco:** Portal externo = múltiplos clientes simultâneos = write contention real
- **Impacto:** Prisma facilita (mudar provider + connection string), mas precisa testar seed, migrations, backup
- **Opções:** (a) Neon/Supabase PostgreSQL, (b) Render PostgreSQL, (c) manter SQLite com WAL mode
- **Recomendação:** Resolver antes ou durante M4, idealmente antes de deploy com clientes reais

### ADR-005: Alternativa ao Puppeteer para PDF
- **Trigger:** "Quando falhar em produção ou M3 criar volume"
- **Risco:** OOM em 512MB RAM do Render
- **Status:** Funciona hoje com volume baixo, monitorar durante M4
- **Opções:** Gotenberg, wkhtmltopdf, API externa, geração client-side

### ADR-006: Estratégia de Observabilidade
- **Trigger:** "Antes de M3" — **ATINGIDO**
- **Risco:** Falhas silenciosas — cliente não consegue pedir, ninguém fica sabendo
- **Mínimo viável:** Sentry (error tracking) + health check com alerta (UptimeRobot/BetterStack)
- **Desejável:** structured logging (Winston/Pino) + métricas básicas

---

## 5. Gaps Conhecidos

| Gap | Severidade | Quando Resolver |
|-----|-----------|-----------------|
| JWT em localStorage (não httpOnly) | Média | Antes de produção com clientes reais |
| Audit log ausente | Baixa | M4 ou posterior |
| ADR-004 SQLite em produção | Alta | Antes/durante M4 |
| ADR-006 Zero observabilidade | Média | Antes de M4 produção |
| Dashboard portal é placeholder | Funcional | M4 entrega #1 |
| Pedido editável em qualquer estado | Média | M4 entrega #5 |

---

## 6. Referências do Repositório

- **Local:** `~/Projetos/Linos/MVP7`
- **Branch:** `main`
- **Prompts:** `~/Projetos/Linos/MVP7/prompts/`
- **Tag M3:** `m3-portal-cliente` (commit `fd064fa`)
- **Deploy:** Render.com (backend + frontend)
- **Memory Cloud:** projeto `linos-panificadora`

---

## 7. Workflow Estabelecido

O projeto usa um workflow de **prompt + validação**:
1. **Claude (chat)** — planejamento, diagnóstico, geração de prompts, validação de resultados
2. **Claude Code (terminal)** — execução dos prompts contra o código real
3. Cada prompt gera commits atômicos com mensagens padronizadas
4. Gate checks ao final de cada fase para validar testes e integridade

**Padrão de diagnóstico:** Toda milestone começa com um prompt de reconhecimento que audita o estado real do código antes de planejar implementação.
