# P65 — Gate Check: Validação Final M4 Portal Cliente F2

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 396 testes passando (commit `b7ea257`).

**Objetivo:** Validação final do milestone M4 Portal Cliente F2. Confirmar que todas as 5 entregas estão funcionais, testes passando, builds green, e criar tag + handoff para M5.

**Entregas M4:**
- E1 Dashboard Cliente (P61 backend + P62 frontend)
- E2 Email Notificação Status (P60)
- E3 Sub-usuários Portal (P63 backend + P64 frontend)
- E4 Relatórios Portal (P62)
- E5 Bloqueio Edição (P59)
- F0 Observabilidade (P58 — Sentry + logging)

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -10
```

Working tree deve estar limpa. Verificar que todos os commits M4 estão na main.

## TAREFA 1 — Validação de Testes

### 1.1 Executar suite completa

```bash
cd ~/Projetos/Linos/MVP7
yarn workspace backend test --no-coverage 2>&1
```

**Registrar:**
- Total de testes
- Total de suites
- Tempo de execução
- Qualquer warning ou skip

### 1.2 Executar com coverage (informativo)

```bash
yarn workspace backend test --coverage 2>&1 | tail -30
```

Registrar cobertura geral (não é gate — apenas informativo para handoff).

## TAREFA 2 — Validação de Builds

### 2.1 Build backend

```bash
yarn workspace backend build 2>&1 | tail -10
```

Confirmar: sem erros, sem warnings relevantes.

### 2.2 Build frontend

```bash
yarn workspace frontend build 2>&1 | tail -15
```

Confirmar: sem erros. Warnings de lint aceitáveis.

## TAREFA 3 — Checklist de Entregas

Verificar cada entrega lendo o código (read-only):

### E1 — Dashboard Cliente
- [ ] `GET /pedidos/dashboard` endpoint existe e tem guard
- [ ] `/portal/dashboard/page.tsx` tem KPI cards, status breakdown, pedidos recentes
- [ ] `useDashboard` hook existe

### E2 — Email Notificação
- [ ] `pedido.status.changed` event emitido em `atualizarStatus()`
- [ ] `@OnEvent('pedido.status.changed')` handler no EmailService
- [ ] Só envia para transições INTERNO
- [ ] Template com mensagens PT-BR por status

### E3 — Sub-usuários
- [ ] TenantGuard no UsuariosController
- [ ] `create()` força `cliente_id` do JWT para CLIENTE
- [ ] `create()` restringe papel por tipo CLIENTE e nível
- [ ] `/portal/usuarios/page.tsx` existe
- [ ] Nav "Minha Equipe" condicional (só CLIENTE_ADMIN)

### E4 — Relatórios Portal
- [ ] `/portal/relatorios/page.tsx` existe
- [ ] Reutiliza `RelatorioVendas` do admin
- [ ] Sem filtro de cliente (tenant-isolated)
- [ ] Link na nav do portal

### E5 — Bloqueio Edição
- [ ] `ESTADOS_BLOQUEIO_EDICAO` constante existe
- [ ] `update()` e `updateItemQuantidade()` usam a constante
- [ ] Somente RASCUNHO e PENDENTE permitem edição

### F0 — Observabilidade
- [ ] SentryModule configurado (graceful sem DSN)
- [ ] SentryExceptionFilter captura 5xx
- [ ] StructuredLoggerService JSON em produção
- [ ] Health check com database connectivity

## TAREFA 4 — Tag e Handoff

### 4.1 Criar tag

```bash
git tag -a m4-portal-cliente-f2 -m "M4 Portal Cliente F2 — Dashboard, Email, Sub-usuários, Relatórios, Bloqueio Edição

Entregas:
- E1: Dashboard com KPIs reais (endpoint dedicado + UI)
- E2: Email notificação status pedido (EventEmitter fire-and-forget)
- E3: Sub-usuários portal (tenant isolation + UI CRUD)
- E4: Relatórios portal (reutiliza RelatorioVendas)
- E5: Bloqueio edição pós-CONFIRMADO
- F0: Sentry + structured logging + health check DB

Stats: XXX testes, XX suites
Commits: f93d491..b7ea257"
```

(Substituir XXX pelo número real de testes e suites)

### 4.2 Gerar handoff M5

Criar `~/Projetos/Linos/MVP7/m5-handoff.md` com:

```markdown
# Handoff M4 → M5

## Estado do Sistema

### Milestones Completos
- M1 Fundação ✅ (211 testes)
- M2 Segurança ✅ (222 testes)
- M3 Portal Cliente F1 ✅ (329 testes)
- M4 Portal Cliente F2 ✅ (XXX testes)

### Tag
`m4-portal-cliente-f2` — commit `XXXXX`

### O que foi entregue no M4
[Listar as 5 entregas + F0 com 1 linha cada]

### Backend — Endpoints Atuais
[Listar todos os endpoints por controller com método/rota/permissão]

### Frontend — Páginas Portal Atuais
[Listar todas as páginas do portal com rota e funcionalidade]

### Frontend — Páginas Admin Atuais
[Listar todas as páginas admin]

### Infraestrutura
- Banco: SQLite com disco persistente Render
- Email: Resend (mock disponível)
- PDF: Puppeteer (mock disponível)
- Error tracking: Sentry (precisa DSN em produção)
- Logging: JSON structured em produção
- Deploy: Render.com auto-deploy main

### ADRs Pendentes
- ADR-004: SQLite → PostgreSQL (ADIADA para antes do go-live)
- ADR-005: Puppeteer → alternativa (MONITORAR)

### Testes
- Total: XXX
- Suites: XX
- Cobertura: XX% (informativo)
- Áreas sem cobertura: frontend React (zero), PdfService (zero unit), SupabaseService (zero unit)

### Sugestões para M5
[Listar possíveis próximos passos: deploy produção, onboarding primeiro cliente, melhorias UX, etc.]
```

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Confirmar tag criada
git tag -l 'm4*'

# 2. Confirmar handoff existe
cat m5-handoff.md | head -20

# 3. Commit handoff
git add m5-handoff.md
git commit -m "docs: add M5 handoff document

M4 Portal Cliente F2 complete — XXX tests, all 5 deliverables + F0 infra
refs: M4-gate"
```

## RESTRIÇÕES

- NÃO modificar código — apenas leitura, validação, tag e handoff
- NÃO instalar dependências
- NÃO alterar testes
- Se algum teste falhar: PARAR e reportar (não tentar corrigir neste prompt)
