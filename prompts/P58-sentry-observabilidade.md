# P58 — Observabilidade Mínima: Sentry + Structured Logging

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. Tag `m3-portal-cliente`. 329 testes passando.

**Objetivo:** Implementar observabilidade mínima viável (ADR-006) antes das features M4. Erros em produção devem ser capturados e rastreáveis. Este é o primeiro prompt do M4 (Fase 0 — Infra).

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 4.2 (estado atual da observabilidade).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 329 testes passando, working tree limpa.

## TAREFA 1 — Sentry Backend (NestJS)

### 1.1 Instalar dependência

```bash
yarn workspace backend add @sentry/nestjs
```

### 1.2 Configurar módulo Sentry

Criar `packages/backend/src/common/sentry/sentry.module.ts`:

- Importar e inicializar Sentry **apenas** se `SENTRY_DSN` estiver definida (graceful skip em dev)
- Configurações:
  - `dsn`: `process.env.SENTRY_DSN`
  - `environment`: `process.env.NODE_ENV || 'development'`
  - `tracesSampleRate`: `0.1` (10% — mínimo para não impactar performance)
  - `enabled`: `!!process.env.SENTRY_DSN`
- Exportar módulo global

### 1.3 Criar filtro global de exceções com Sentry

Criar `packages/backend/src/common/sentry/sentry-exception.filter.ts`:

- Implementar `ExceptionFilter` do NestJS
- Para **cada exceção não-HttpException** (erros internos 500): capturar no Sentry com `Sentry.captureException()`
- Para **HttpException** com status >= 500: também capturar
- Para 4xx (BadRequest, Unauthorized, Forbidden, NotFound): **NÃO** capturar (são erros esperados do cliente)
- Manter o response padrão do NestJS (não alterar o comportamento existente)
- Adicionar contexto: `request.url`, `request.method`, `user.id` (se disponível no request)

### 1.4 Registrar no AppModule

- Importar `SentryModule` no `app.module.ts`
- Registrar `SentryExceptionFilter` como filtro global via `APP_FILTER`
- **NÃO** remover ou alterar o `ThrottleExceptionFilter` existente — o SentryExceptionFilter deve ter prioridade menor (rodar depois)

### 1.5 Variáveis de ambiente

- **Não criar conta Sentry agora.** Apenas preparar o código.
- Adicionar `SENTRY_DSN=` (vazio) no `.env.example` com comentário
- Em `render.yaml`: adicionar `SENTRY_DSN` no envVarGroup `linos-env` (valor será preenchido manualmente no deploy)

## TAREFA 2 — Structured Logging

### 2.1 Criar LoggerService customizado

Criar `packages/backend/src/common/logger/structured-logger.service.ts`:

- Extender `ConsoleLogger` do NestJS
- Override dos métodos `log()`, `error()`, `warn()`, `debug()`:
  - Em **produção** (`NODE_ENV=production`): output JSON com campos `{ timestamp, level, message, context, ...extra }`
  - Em **desenvolvimento**: manter output padrão do NestJS (colorido, legível)
- Método helper `logWithContext(level, message, context, extra?)` para logs de negócio

### 2.2 Registrar como logger global

Em `main.ts`, antes do `app.listen()`:

```typescript
if (process.env.NODE_ENV === 'production') {
  app.useLogger(app.get(StructuredLoggerService));
}
```

### 2.3 Adicionar logs de negócio nos pontos críticos

Adicionar `StructuredLoggerService` e logs nos seguintes pontos (sem alterar lógica existente):

| Local | Evento | Nível | Dados |
|-------|--------|-------|-------|
| `auth.service.ts` → login | Login bem-sucedido | `log` | `{ userId, papel, clienteId? }` |
| `auth.service.ts` → login | Login falhou | `warn` | `{ email, motivo }` |
| `auth.service.ts` → registrarCliente | Novo registro | `log` | `{ clienteId, email }` |
| `pedidos.service.ts` → atualizarStatus | Transição de status | `log` | `{ pedidoId, de, para, userId }` |
| `pedidos.service.ts` → create | Pedido criado | `log` | `{ pedidoId, clienteId, userId }` |
| `clientes.service.ts` → aprovar | Cliente aprovado | `log` | `{ clienteId, aprovadoPor }` |
| `pdf.service.ts` → generatePedidoPdf | PDF gerado | `log` | `{ pedidoId, durationMs }` |
| `pdf.service.ts` → generatePedidoPdf | PDF falhou | `error` | `{ pedidoId, error }` |

**Regra:** Adicionar logging como linhas extras. NÃO refatorar, NÃO mover código, NÃO alterar signatures de métodos.

## TAREFA 3 — Health Check Enhancement

### 3.1 Expandir endpoint `/health`

O endpoint `GET /health` já existe. Expandir o retorno para incluir:

```json
{
  "status": "ok",
  "timestamp": "2026-02-24T12:00:00.000Z",
  "environment": "production",
  "service": "linos-backend",
  "version": "m4",
  "uptime": 3600,
  "database": "connected"
}
```

- `uptime`: `process.uptime()` em segundos
- `database`: executar `prisma.$queryRaw('SELECT 1')` com try/catch — retornar `"connected"` ou `"disconnected"`
- Se database disconnected, retornar HTTP 503 ao invés de 200

## TAREFA 4 — Testes

### 4.1 Testes do SentryExceptionFilter

Criar `packages/backend/src/common/sentry/sentry-exception.filter.spec.ts`:

- Mock do Sentry (`jest.mock('@sentry/nestjs')`)
- Teste: exceção genérica (Error) → `captureException` chamado
- Teste: HttpException 500 → `captureException` chamado
- Teste: HttpException 400 → `captureException` NÃO chamado
- Teste: HttpException 401 → `captureException` NÃO chamado
- Teste: HttpException 404 → `captureException` NÃO chamado
- Teste: contexto do request (url, method) adicionado ao scope

### 4.2 Testes do StructuredLoggerService

Criar `packages/backend/src/common/logger/structured-logger.service.spec.ts`:

- Teste: em production, output é JSON válido com campos esperados
- Teste: em development, usa formato padrão
- Teste: `logWithContext` inclui extra data

### 4.3 Teste do Health Check expandido

Expandir testes existentes do health check (ou criar se não existir):

- Teste: database conectado → 200 com `database: "connected"`
- Teste: database falhou → 503 com `database: "disconnected"`

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes — devem passar todos (329 existentes + novos)
yarn workspace backend test 2>&1 | tail -10

# 2. Build — deve compilar sem erros
yarn workspace backend build 2>&1 | tail -5

# 3. Verificar que Sentry é graceful sem DSN
NODE_ENV=development yarn workspace backend start 2>&1 | head -20
# Deve iniciar normalmente sem erros de Sentry

# 4. Git
git add -A
git status
git commit -m "feat(backend): add Sentry error tracking + structured logging + health check enhancement

- Sentry integration with exception filter (5xx only)
- Structured JSON logging in production
- Business event logging (auth, pedidos, clientes, pdf)
- Health check with database connectivity
- Graceful degradation: works without SENTRY_DSN

refs: ADR-006, M4-F0"
```

## CONTAGEM ESPERADA

- Testes anteriores: 329
- Novos testes estimados: ~12-15
- **Meta: 341+ testes passando**

## RESTRIÇÕES

- NÃO instalar Sentry no frontend (será avaliado depois se necessário)
- NÃO criar conta Sentry — apenas preparar integração no código
- NÃO alterar lógica de negócio existente — apenas adicionar logging e error tracking
- NÃO alterar testes existentes — apenas adicionar novos
- NÃO modificar o ThrottleExceptionFilter existente
