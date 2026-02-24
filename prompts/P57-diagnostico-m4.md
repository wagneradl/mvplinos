# P57 — Diagnóstico de Reconhecimento M4 Portal Cliente F2

**Data:** 2026-02-24
**Tipo:** Read-only analysis — nenhum código modificado
**Baseline:** commit `fd064fa` (tag `m3-portal-cliente`), 329 testes

---

## Seção 1 — Estado do Backend

### 1.1 Prisma Migrations

12 migrations aplicadas, schema up to date:

| # | Migration | Descrição |
|---|-----------|-----------|
| 1 | `20250220041725_init` | Schema inicial (Usuario, Cliente, Produto, Pedido, ItemPedido) |
| 2 | `20250308183459_fix_model_names` | Fix de nomes de modelos |
| 3 | `20250308202242_fix_model_names` | Fix de nomes de modelos (parte 2) |
| 4 | `20250412182824_add_usuario_papel_models` | Modelo Papel com permissões JSON |
| 5 | `20250415122603_add_pdf_url` | Campo pdf_url no Pedido |
| 6 | `20250419212745_add_unique_to_produto_nome` | Unique constraint em Produto.nome |
| 7 | `20250510222344_add_observacoes_to_pedido` | Campo observacoes no Pedido |
| 8 | `20251204120000_add_papel_fields_and_password_reset` | Campos tipo/nivel/codigo no Papel + PasswordResetToken |
| 9 | `20251205114007_adjust_papel_boolean_field` | Ajuste campo boolean Papel.ativo |
| 10 | `20260219043902_add_refresh_token` | Modelo RefreshToken |
| 11 | `20260222183844_add_usuario_cliente_relation` | Relação Usuario→Cliente (cliente_id) |
| 12 | `20260223160152_add_created_by_pedido` | Campo created_by no Pedido |

### 1.2 Schema (Modelos Prisma)

| Modelo | Campos-chave | Observações |
|--------|-------------|-------------|
| **Usuario** | id, nome, email, senha, papel_id, cliente_id?, status, deleted_at? | Soft delete, relação com Papel e Cliente |
| **Papel** | id, nome, codigo, descricao, tipo (INTERNO/CLIENTE), nivel, permissoes (JSON), ativo | Hierarquia via nivel |
| **Cliente** | id, cnpj (unique), razao_social, nome_fantasia, email, telefone, status, deleted_at? | Status: ativo, pendente_aprovacao, rejeitado, suspenso, inativo |
| **Produto** | id, nome (unique), preco_unitario, tipo_medida, status, deleted_at? | Soft delete |
| **Pedido** | id, cliente_id, created_by?, data_pedido, valor_total, status, pdf_path?, pdf_url?, observacoes?, deleted_at? | 7 status, PDF dual storage |
| **ItemPedido** | id, pedido_id, produto_id, quantidade, preco_unitario, valor_total_item | Line items |
| **RefreshToken** | id, usuario_id, token (unique), ip_address?, user_agent?, expires_at, revoked_at? | Rotation + single-session |
| **PasswordResetToken** | id, usuario_id, token (unique), expires_at, used_at? | Token único 15min |

### 1.3 Endpoints REST

**Auth (`/auth`)** — 8 endpoints
| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| POST | `/login` | Throttle(login) | Autenticação JWT |
| POST | `/registrar-cliente` | Throttle(login) | Auto-cadastro público |
| POST | `/refresh` | Throttle(login) | Refresh token rotation |
| POST | `/logout` | JwtAuthGuard | Revogar refresh token |
| GET | `/me` | JwtAuthGuard | Dados do usuário autenticado |
| POST | `/reset-solicitar` | Throttle(reset) | Solicitar reset de senha |
| GET | `/reset-validar/:token` | Throttle(reset) | Validar token de reset |
| POST | `/reset-confirmar` | Throttle(reset) | Confirmar nova senha |

**Pedidos (`/pedidos`)** — 11 endpoints
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/` | pedidos:criar | Criar pedido (CLIENTE→RASCUNHO, INTERNO→PENDENTE) |
| GET | `/` | pedidos:listar | Listar com filtros + paginação + tenant |
| GET | `/reports/summary` | relatorios:ver | Relatório summary (JSON) |
| GET | `/reports/pdf` | relatorios:exportar | Relatório PDF |
| GET | `/:id` | pedidos:ver | Detalhe do pedido |
| GET | `/:id/pdf` | pedidos:ver | Download PDF (4-stage fallback) |
| PATCH | `/:id` | pedidos:editar | Atualizar pedido |
| PATCH | `/:id/status` | pedidos:editar | Transição de status |
| PATCH | `/:id/itens/:itemId` | pedidos:editar | Atualizar quantidade item |
| DELETE | `/:id` | pedidos:cancelar | Soft delete |
| POST | `/:id/repeat` | pedidos:criar | Repetir pedido |

**Clientes (`/clientes`)** — 8 endpoints
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/` | clientes:criar | Criar cliente |
| GET | `/` | clientes:listar | Listar + busca + paginação + tenant |
| GET | `/cnpj/:cnpj` | clientes:ver | Buscar por CNPJ |
| GET | `/:id` | clientes:ver | Detalhe |
| PATCH | `/:id` | clientes:editar | Atualizar |
| DELETE | `/:id` | clientes:desativar | Soft delete |
| PATCH | `/:id/aprovar` | clientes:editar | Aprovar cadastro pendente |
| PATCH | `/:id/rejeitar` | clientes:editar | Rejeitar cadastro pendente |

**Produtos (`/produtos`)** — 5 endpoints, **Usuarios (`/usuarios`)** — 6 endpoints, **Admin (`/admin`)** — 3 endpoints, **Health (`/health`)** — 1 endpoint

### 1.4 EmailModule

- **Provider:** Resend (API)
- **Modo mock:** `EMAIL_MOCK=true` loga no console
- **Templates existentes:** Password reset (HTML styled)
- **Eventos:** `@OnEvent('password.reset.requested')` no EmailService
- **Método genérico:** `enviarEmail({ to, subject, text?, html? })` — reutilizável
- **Emails já implementados:** Reset de senha, confirmação de cadastro (em auth.service), aprovação/rejeição (em clientes.service)
- **Gap M4:** Nenhum template para notificação de status de pedido

### 1.5 PdfModule

- **Engine:** Puppeteer (headless Chrome)
- **Storage:** Supabase Storage (primário) + fallback local
- **Modo mock:** `PDF_MOCK=true` gera stub PDF
- **Templates existentes:**
  - `generatePedidoPdf(pedidoData)` — PDF individual do pedido (header, dados cliente, itens, observações, total)
  - `generateReportPdf(reportData, clienteData?)` — Relatório com resumo, tabela detalhada, período
- **Gap M4:** Templates existentes são suficientes; considerar otimização de memória

### 1.6 Transições de Status

```
RASCUNHO → [PENDENTE, CANCELADO]
PENDENTE → [CONFIRMADO, CANCELADO]
CONFIRMADO → [EM_PRODUCAO, CANCELADO]
EM_PRODUCAO → [PRONTO, CANCELADO]
PRONTO → [ENTREGUE]
ENTREGUE → [] (final)
CANCELADO → [] (final)
```

**Transições por papel:**
- **CLIENTE:** RASCUNHO→PENDENTE, RASCUNHO→CANCELADO, PENDENTE→CANCELADO
- **INTERNO:** PENDENTE→CONFIRMADO, CONFIRMADO→EM_PRODUCAO, EM_PRODUCAO→PRONTO, PRONTO→ENTREGUE, PENDENTE/CONFIRMADO/EM_PRODUCAO→CANCELADO

### 1.7 Bloqueio de Edição

- **Estados finais (ENTREGUE, CANCELADO):** `update()` e `updateItemQuantidade()` lançam `BadRequestException`
- **Gap M4:** Não há bloqueio por "janela de edição" (ex: bloquear edição após CONFIRMADO). Atualmente, edição é permitida em qualquer status não-final.

### 1.8 Sub-usuários

- **Estado atual:** Schema suporta múltiplos usuários por cliente (`Usuario.cliente_id`). O endpoint `POST /usuarios` aceita criação com `cliente_id` pelo papel CLIENTE_ADMIN.
- **Papéis existentes no seed:** CLIENTE_ADMIN (nível 30), CLIENTE_USUARIO (nível 10)
- **Gap M4:** Nenhum endpoint dedicado para gerenciamento de sub-usuários no portal. A criação funciona via `/usuarios` mas sem UI no portal.

---

## Seção 2 — Estado do Frontend

### 2.1 Route Groups

| Grupo | Layout | Páginas |
|-------|--------|---------|
| `(admin)` | Sidebar permanente (Navigation), AppBar mobile | dashboard, clientes, produtos, pedidos, usuarios, relatorios |
| `(portal)` | AppBar horizontal com logo, nav links, logout | portal/dashboard, portal/catalogo, portal/pedidos |
| Raiz | — | login, registrar, esqueci-senha, reset-senha |

### 2.2 Páginas do Portal

| Página | Rota | Estado |
|--------|------|--------|
| **Dashboard** | `/portal/dashboard` | Implementada — welcome card com links para Catálogo e Pedidos |
| **Catálogo** | `/portal/catalogo` | Implementada — grid de produtos, busca, ordenação, dialog detalhe |
| **Meus Pedidos** | `/portal/pedidos` | Implementada — tabela paginada, filtro status, cancel |
| **Novo Pedido** | `/portal/pedidos/novo` | Implementada — busca produtos, qtd +/-, salvar rascunho/enviar |
| **Detalhe Pedido** | `/portal/pedidos/[id]` | Implementada — timeline, itens, PDF, cancelamento |

### 2.3 Componentes Reutilizáveis

| Componente | Uso | Compartilhado? |
|-----------|------|----------------|
| `StatusTimeline` | Timeline horizontal de status com animação | Admin + Portal |
| `TransitionButtons` | Botões de transição baseados em papel | Admin + Portal |
| `StatusChip` | Badge colorido de status | Admin + Portal |
| `Navigation` | Sidebar admin com sub-menus | Apenas Admin |
| `PedidosFilter` | Filtros de pedido | Admin |
| `PedidosTable` | Tabela de pedidos | Admin |
| `ProdutoCard` | Card de produto no catálogo | Portal |
| `ClienteForm` / `ProdutoForm` / `UsuarioForm` | Formulários CRUD | Admin |
| `EmptyState` / `ErrorState` / `ErrorFeedback` | Estados de feedback | Ambos |

### 2.4 AuthContext

- **Dados do usuário:** id, nome, email, clienteId?, papel (id, nome, codigo, tipo, nivel, permissoes)
- **Token management:** access_token (15min), refresh_token (24h) em localStorage
- **Refresh automático:** Ao carregar página, se access_token expirado tenta refresh
- **Roteamento por papel:** `getDashboardRoute()` → CLIENTE vai para `/portal/dashboard`, INTERNO para `/dashboard`
- **Permissões:** `hasPermission(recurso, acao)` verifica JSON de permissões do papel

### 2.5 Services Frontend

| Service | Métodos |
|---------|---------|
| `auth.service` | login, registrar, refresh, logout, serverLogout, reset |
| `pedidos.service` | listar, obter, criar, atualizarPedido, atualizarStatus, deletar, repetir, downloadPdf, getPedidoPdf, gerarRelatorio, downloadRelatorioPdf |
| `clientes.service` | listar, obter, criar, atualizar, deletar, aprovar, rejeitar |
| `produtos.service` | listar, obter, criar, atualizar, deletar |
| `usuarios.service` | listar, obter, criar, atualizar, deletar, listarPapeis |

### 2.6 Hooks

| Hook | Funcionalidade |
|------|---------------|
| `usePedidos` | CRUD + status + PDF + relatórios via React Query |
| `useProdutos` | CRUD + paginação via React Query |
| `useClientes` | CRUD + aprovar/rejeitar via React Query |
| `useUsuarios` | CRUD + papéis via React Query |
| `useRelatorios` | Geração de relatórios |
| `useDebounce` | Debounce genérico (400ms) |
| `useSnackbar` | Feedback visual via snackbar |

---

## Seção 3 — Análise de Gaps para M4

### E1 — Dashboard do Cliente

**Requisitos:** Resumo visual com pedidos recentes, totais, status breakdown.

**Estado atual:** Dashboard portal é apenas welcome card com 2 links. Sem dados dinâmicos.

**Gaps identificados:**
1. **Backend:** Endpoint `GET /pedidos/reports/summary` já existe, mas retorna dados orientados a relatório (data/valor por dia). Precisará de endpoint dedicado ou query customizada para dashboard (ex: pedidos por status, últimos N pedidos, valor total do mês).
2. **Frontend:** Página `/portal/dashboard` precisa ser reescrita com cards de KPI, gráfico/breakdown de status, tabela de pedidos recentes.
3. **Estimativa:** Backend: novo endpoint ou reuso com filtros → ~50 LOC. Frontend: nova UI dashboard → ~200-300 LOC.

### E2 — Notificações por Email

**Requisitos:** Email ao cliente quando status do pedido muda.

**Estado atual:** EmailService existe com `enviarEmail()` genérico + Resend. Já envia emails para: password reset, confirmação cadastro, aprovação/rejeição.

**Gaps identificados:**
1. **Backend:** Falta emitir evento/chamar EmailService no `atualizarStatus()` do PedidosService. Falta template HTML para notificação de status.
2. **Dados necessários:** O email do cliente precisa ser carregado junto com o pedido no `atualizarStatus()` (incluir relação `cliente` no findOne).
3. **Configuração:** `EMAIL_MOCK=true` já suportado, sem risco para dev/test.
4. **Estimativa:** Template HTML + chamada no atualizarStatus + testes → ~100-150 LOC.

### E3 — Sub-usuários do Cliente

**Requisitos:** CLIENTE_ADMIN pode criar/gerenciar sub-usuários (CLIENTE_USUARIO) para sua empresa.

**Estado atual:**
- Schema suporta (Usuario.cliente_id, Papel com tipo CLIENTE)
- Papéis CLIENTE_ADMIN (nível 30) e CLIENTE_USUARIO (nível 10) existem no seed
- Endpoint `POST /usuarios` funciona com tenant isolation
- UsuariosService permite listar por cliente_id
- **Zero code** no portal frontend para gerenciamento de sub-usuários

**Gaps identificados:**
1. **Backend:** Endpoint `/usuarios` já funciona. Pode precisar de validação adicional: CLIENTE_ADMIN só cria CLIENTE_USUARIO do mesmo cliente.
2. **Frontend:** Nova página `/portal/usuarios` com listagem + criação + edição. Reutilizar pattern de `useUsuarios` hook.
3. **Permissões:** Papel CLIENTE_ADMIN precisa ter `usuarios: ['listar', 'ver', 'criar', 'editar']` no JSON de permissões.
4. **Estimativa:** Backend: ~30 LOC (validação extra). Frontend: nova página + form → ~250-350 LOC.

### E4 — Relatórios e PDFs (Portal)

**Requisitos:** Cliente pode gerar relatórios dos seus pedidos em PDF.

**Estado atual:**
- Backend: `GET /pedidos/reports/summary` e `GET /pedidos/reports/pdf` existem com tenant isolation
- Frontend: `pedidos.service.ts` já tem `gerarRelatorio()` e `downloadRelatorioPdf()`
- Admin já usa estes endpoints na página de relatórios
- PdfService tem `generateReportPdf()` funcional

**Gaps identificados:**
1. **Frontend:** Falta página `/portal/relatorios` no portal. Pode reutilizar componente `RelatorioVendas` do admin (adaptado).
2. **Permissões:** Papel CLIENTE_ADMIN/CLIENTE_USUARIO precisa ter `relatorios: ['ver', 'exportar']`.
3. **Estimativa:** Frontend: nova página reutilizando componente existente → ~100-150 LOC. Backend: zero (já funcional).

### E5 — Bloqueio de Edição

**Requisitos:** Impedir edição de pedido após status CONFIRMADO.

**Estado atual:**
- Edição bloqueada apenas em estados finais (ENTREGUE, CANCELADO)
- Pedidos em CONFIRMADO, EM_PRODUCAO, PRONTO podem ser editados (items, observações)
- Frontend: botão "cancelar" visível apenas em RASCUNHO e PENDENTE
- Backend: `update()` e `updateItemQuantidade()` verificam `ESTADOS_FINAIS`

**Gaps identificados:**
1. **Backend:** Expandir `ESTADOS_FINAIS` ou criar `ESTADOS_BLOQUEIO_EDICAO = ['CONFIRMADO', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO']` para bloqueio de edição.
2. **Frontend:** Desabilitar botões de edição/repetição no portal quando status ≥ CONFIRMADO.
3. **Decisão de design:** O bloqueio deve ser total (nenhuma edição) ou parcial (observações ainda editáveis)?
4. **Estimativa:** Backend: ~10 LOC (alterar validação). Frontend: ~20 LOC (condicional em botões). Testes: ~30 LOC.

---

## Seção 4 — Infraestrutura e ADRs

### 4.1 SQLite

**Decisão:** SQLite confirmado como banco de dados em produção.
- **Deploy:** Render.com com disco persistente de 2GB (`/var/data/linos-panificadora.db`)
- **Prisma driver:** `provider = "sqlite"`, `url = env("DATABASE_URL")`
- **Limitações conhecidas:** Single-writer, sem full-text search nativo avançado, sem JSON operators
- **Status:** Funcional e estável para o volume atual

### 4.2 Observabilidade

- **Health check:** `GET /health` retorna `{ status, timestamp, environment, service }` — configurado no render.yaml
- **Logging:** NestJS Logger em todos os services. Debug logging via `debugLog()` utility.
- **Métricas:** Nenhum APM configurado (sem Datadog, New Relic, etc.)
- **Gap:** Sem structured logging, sem alertas, sem métricas de negócio

### 4.3 Puppeteer / PDF

- **Modo produção:** `PUPPETEER_SKIP_DOWNLOAD=true` no render.yaml (usa Puppeteer do sistema)
- **Geração:** Uma instância browser por PDF, com `browser.close()` no finally
- **Risco de memória:** Cada geração abre/fecha Chrome headless. Em carga alta pode causar OOM.
- **Mitigação atual:** Modo mock (`PDF_MOCK=true`) para testes, geração fora da transaction
- **Gap:** Sem pool de browsers, sem limite de concorrência

### 4.4 Segurança

- **Rate limiting:** ThrottlerModule com grupos `login` (5 req/60s) e `reset` (3 req/60s)
- **JWT:** Access token 15min, refresh token 24h com rotation
- **Tenant isolation:** TenantGuard extrai clienteId do JWT e injeta no request
- **Permissões:** PermissoesGuard verifica JSON do papel
- **CORS:** Lista whitelist de origens no render.yaml
- **Password:** bcryptjs hash

### 4.5 Deploy

- **Plataforma:** Render.com (2 web services: backend starter, frontend starter)
- **Auto-deploy:** Push to `main` → deploy automático
- **Build:** `prisma generate` + `yarn build` (backend), `yarn build` (frontend)
- **Start:** `prisma migrate deploy` + `yarn seed` + `node dist/main.js`
- **Secrets:** JWT_SECRET (auto-generated), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY via envVarGroups

---

## Seção 5 — Testes

### 5.1 Resultado

```
Test Suites: 16 passed, 16 total
Tests:       329 passed, 329 total
Time:        ~19s
```

### 5.2 Suites e Contagens

| # | Suite | Testes | Área |
|---|-------|--------|------|
| 1 | `pedidos/pedidos.service.spec.ts` | 63 | CRUD, status, tenant, PDF, relatórios |
| 2 | `clientes/clientes.service.spec.ts` | 37 | CRUD, soft delete, CNPJ, aprovar/rejeitar, **tenant isolation** |
| 3 | `usuarios/usuarios.service.spec.ts` | 35 | CRUD, roles, hierarquia, soft delete |
| 4 | `auth/auth.service.spec.ts` | 34 | Login, registro, refresh, logout, cleanup, validate |
| 5 | `produtos/produtos.service.spec.ts` | 28 | CRUD, validação, soft delete, unique nome |
| 6 | `pedidos/pedidos.controller.spec.ts` | 22 | Delegação controller→service, PDF endpoints |
| 7 | `pedidos/constants/transicoes-pedido.spec.ts` | 22 | State machine, por papel, estados finais |
| 8 | `auth/services/password-reset.service.spec.ts` | 16 | Solicitar, validar, confirmar, cleanup |
| 9 | `auth/auth.controller.spec.ts` | 13 | Delegação controller→service |
| 10 | `auth/auth.controller.throttle.spec.ts` | 13 | Rate limiting decorators |
| 11 | `email/email.service.spec.ts` | 13 | Mock mode, Resend mode, error handling |
| 12 | `pedidos/pedidos.status.spec.ts` | 10 | Transições por papel (CLIENTE vs INTERNO) |
| 13 | `auth/guards/tenant.guard.spec.ts` | 7 | INTERNO vs CLIENTE, clienteId injection |
| 14 | `pedidos/pedidos.tenant.spec.ts` | 7 | Cross-client isolation, admin full access |
| 15 | `auth/auth.integration.spec.ts` | 6 | Registro→Aprovação→Login, Rejeição→Bloqueio |
| 16 | `common/filters/throttle-exception.filter.spec.ts` | 3 | Status 429, mensagem PT-BR |

### 5.3 Áreas Não Cobertas (Gaps para M4)

| Área | Status | Observação |
|------|--------|-----------|
| Email de notificação de status | Sem teste | Não implementado ainda |
| Dashboard data endpoint | Sem teste | Endpoint inexistente |
| Sub-usuário: CLIENTE_ADMIN criar CLIENTE_USUARIO | Parcial | UsuariosService testado, mas sem teste específico de restrição por cliente |
| Bloqueio edição pós-CONFIRMADO | Sem teste | Lógica inexistente |
| PdfService (unit tests) | Zero | Testado indiretamente via mocks; Puppeteer precisa de mock ou e2e |
| SupabaseService | Zero | Testado indiretamente; upload/download não unit-tested |
| Frontend (React) | Zero | Nenhum teste de componente ou integração |
| Controllers (e2e) | Zero | Apenas testes de delegação (unit), sem supertest |

---

## Resumo Executivo

### O que está pronto para M4:
1. **Schema Prisma** suporta todas as entidades necessárias sem novas migrations
2. **EmailService** com `enviarEmail()` genérico pronto para templates novos
3. **PdfService** com geração de pedido e relatório funcionais
4. **Tenant isolation** completa no backend (guard + service)
5. **Transições de status** com validação dual (state machine + papel)
6. **AuthContext** com suporte a CLIENTE/INTERNO routing
7. **Portal** com 5 páginas funcionais e componentes reutilizáveis

### O que precisa ser construído:
| Entrega | Backend | Frontend | Estimativa LOC |
|---------|---------|----------|---------------|
| E1 Dashboard | Endpoint de KPIs (~50) | Página com cards/gráficos (~300) | ~350 |
| E2 Email notificação | Template + chamada em atualizarStatus (~100) | — | ~100 |
| E3 Sub-usuários | Validação extra (~30) | Página + form (~300) | ~330 |
| E4 Relatórios portal | Zero (já existe) | Página reutilizando componente (~150) | ~150 |
| E5 Bloqueio edição | Expandir validação (~10) | Condicional em botões (~20) | ~30 |
| **Total estimado** | **~190 LOC** | **~770 LOC** | **~960 LOC** |

### Decisões pendentes (ADR):
1. **E1:** Endpoint dedicado `/pedidos/dashboard` ou reutilizar `/reports/summary` com filtros extras?
2. **E2:** Email síncrono no `atualizarStatus()` ou fire-and-forget via EventEmitter?
3. **E3:** Sub-usuário pode fazer pedidos independentemente ou apenas visualizar?
4. **E5:** Bloqueio total pós-CONFIRMADO ou parcial (observações editáveis)?
