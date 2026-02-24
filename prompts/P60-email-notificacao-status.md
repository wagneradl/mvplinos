# P60 — Notificação Email na Transição de Status do Pedido

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 347 testes passando (commit `fcdf5ad`).

**Objetivo:** Enviar email ao cliente quando o status do pedido muda. Decisão de design D2: fire-and-forget via EventEmitter (pattern já usado para password reset). O EmailService já possui `enviarEmail()` genérico e integração com Resend. `EMAIL_MOCK=true` loga no console.

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 1.4 (EmailModule) e Seção 3 (E2).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 347 testes passando, working tree limpa.

## TAREFA 1 — Evento de Transição de Status

### 1.1 Definir evento

Criar (ou adicionar em arquivo de eventos existente) o tipo do evento:

```typescript
// Sugestão de payload
interface PedidoStatusChangedEvent {
  pedidoId: number;
  clienteEmail: string;
  clienteNome: string;
  numeroPedido: number; // ou id
  statusAnterior: string;
  statusNovo: string;
  atualizadoPor: string; // nome do usuário que fez a transição
}
```

### 1.2 Emitir evento no PedidosService.atualizarStatus()

Em `packages/backend/src/pedidos/pedidos.service.ts`:

- Injetar `EventEmitter2` (já deve estar disponível via `@nestjs/event-emitter`)
- Após a transição de status bem-sucedida (depois do `prisma.pedido.update`), emitir:
  ```typescript
  this.eventEmitter.emit('pedido.status.changed', payload);
  ```
- O payload precisa do email do cliente. O pedido já tem `cliente_id` — carregar a relação `cliente` no `findUnique` que busca o pedido (adicionar `include: { cliente: true }` se ainda não estiver)
- **Fire-and-forget:** não await, não try/catch no emit. Se o email falhar, o status já foi atualizado.

**Atenção:** Verificar se `EventEmitterModule` já está importado no `AppModule`. Se não, adicionar:
```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';
// No imports do AppModule:
EventEmitterModule.forRoot(),
```

## TAREFA 2 — Listener e Template de Email

### 2.1 Listener no EmailService

Em `packages/backend/src/email/email.service.ts` (ou criar listener dedicado se o service já estiver grande):

```typescript
@OnEvent('pedido.status.changed')
async handlePedidoStatusChanged(event: PedidoStatusChangedEvent): Promise<void> {
  // Construir email e enviar
}
```

### 2.2 Template HTML do email

Criar template para notificação de status. Manter consistência visual com o template de password reset existente.

**Conteúdo do email:**
- **Subject:** `Lino's Panificadora — Pedido #${numeroPedido}: ${statusLabel}`
- **Body:**
  - Saudação: `Olá, ${clienteNome}`
  - Mensagem: `O status do seu pedido #${numeroPedido} foi atualizado.`
  - Status anterior → Status novo (visual, pode ser texto simples com destaque)
  - Mapa de mensagens amigáveis por status:

| Status novo | Mensagem amigável |
|-------------|-------------------|
| PENDENTE | Seu pedido foi enviado e está aguardando confirmação. |
| CONFIRMADO | Seu pedido foi confirmado! Estamos preparando tudo. |
| EM_PRODUCAO | Seu pedido está em produção. |
| PRONTO | Seu pedido está pronto para retirada/entrega! |
| ENTREGUE | Seu pedido foi entregue. Obrigado pela preferência! |
| CANCELADO | Seu pedido foi cancelado. |

  - Footer: `Lino's Panificadora — Este é um email automático, não responda.`

### 2.3 Decisão: Quais transições enviam email?

**Todas** as transições enviam email ao cliente, EXCETO:
- RASCUNHO → PENDENTE (feita pelo próprio cliente, ele já sabe)
- RASCUNHO → CANCELADO (feita pelo próprio cliente)
- PENDENTE → CANCELADO **quando feita pelo cliente** (ele já sabe)

**Regra simplificada:** Enviar email apenas quando a transição é feita por um usuário INTERNO (papel.tipo === 'INTERNO'). Isso cobre: PENDENTE→CONFIRMADO, CONFIRMADO→EM_PRODUCAO, EM_PRODUCAO→PRONTO, PRONTO→ENTREGUE, e cancelamentos pelo admin.

Incluir no payload do evento um campo `tipoUsuario: 'INTERNO' | 'CLIENTE'` e no listener verificar:
```typescript
if (event.tipoUsuario !== 'INTERNO') return; // Cliente já sabe, não precisa de email
```

## TAREFA 3 — Testes

### 3.1 Teste de emissão do evento

Em `packages/backend/src/pedidos/pedidos.service.spec.ts` (ou `pedidos.status.spec.ts`):

- Mock do `EventEmitter2`
- Teste: `atualizarStatus()` com transição válida → `eventEmitter.emit` chamado com `'pedido.status.changed'` e payload correto
- Teste: `atualizarStatus()` com transição inválida (erro) → `eventEmitter.emit` NÃO chamado
- Teste: payload contém `clienteEmail`, `statusAnterior`, `statusNovo`, `tipoUsuario`

### 3.2 Teste do listener de email

Em `packages/backend/src/email/email.service.spec.ts`:

- Teste: evento com `tipoUsuario: 'INTERNO'` → `enviarEmail()` chamado com subject e HTML corretos
- Teste: evento com `tipoUsuario: 'CLIENTE'` → `enviarEmail()` NÃO chamado
- Teste: cada status novo gera mensagem amigável correta (parametrizar com `each`)
- Teste: email contém nome do cliente e número do pedido
- Teste: falha no `enviarEmail()` não lança exceção (fire-and-forget, log de erro)

### 3.3 Teste do template

- Teste: HTML do email contém elementos esperados (saudação, status, footer)
- Pode ser incluído nos testes do listener acima

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes — todos devem passar (347 existentes + novos)
yarn workspace backend test 2>&1 | tail -10

# 2. Build
yarn workspace backend build 2>&1 | tail -5

# 3. Verificar mock mode funciona
EMAIL_MOCK=true yarn workspace backend start 2>&1 | head -20
# Deve iniciar sem erros

# 4. Git
git add -A
git status
git commit -m "feat(email): notify client on order status change

- Emit 'pedido.status.changed' event in atualizarStatus()
- EmailService listener with fire-and-forget pattern
- HTML template with friendly status messages (PT-BR)
- Only notify on INTERNO-initiated transitions
- Graceful: EMAIL_MOCK=true logs to console

Decision D2: EventEmitter fire-and-forget
refs: M4-F1, E2"
```

## CONTAGEM ESPERADA

- Testes anteriores: 347
- Novos testes estimados: ~8-12
- **Meta: 355+ testes passando**

## RESTRIÇÕES

- NÃO alterar lógica de transição de status — apenas emitir evento APÓS transição bem-sucedida
- NÃO fazer o email síncrono (sem await na emissão)
- NÃO enviar email para transições feitas pelo próprio cliente
- NÃO alterar testes existentes de transição de status
- NÃO implementar fila de emails (overkill para o volume atual)
