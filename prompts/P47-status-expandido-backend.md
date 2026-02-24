# P47 — Backend: 6 Estados de Pedido + Mapa de Transições

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. F0 concluído (TenantGuard, route groups, 241 testes).

**Objetivo:** Expandir status do pedido de 4 estados para 6, implementar mapa de transições válidas com validação, e garantir que transições inválidas sejam bloqueadas.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -5
yarn workspace backend test 2>&1 | tail -10
```

Garantir 241 testes passando e working tree limpa.

## TAREFA 1 — Expandir Enum de Status

Verificar o enum/constantes de status atual em `packages/backend/prisma/schema.prisma` e nos services.

**Estados atuais (provavelmente 4):** PENDENTE, EM_PREPARO, PRONTO, ENTREGUE

**Novos 6 estados:**
```
RASCUNHO        → pedido sendo montado (cliente ainda editando)
PENDENTE        → enviado, aguardando confirmação da panificadora
CONFIRMADO      → panificadora aceitou o pedido
EM_PRODUCAO     → pedido sendo produzido
PRONTO          → produção concluída, pronto para entrega/retirada
ENTREGUE        → entregue ao cliente (estado final)
CANCELADO       → cancelado (estado final, acessível de vários estados)
```

**ATENÇÃO:** Verificar os nomes exatos usados hoje no código (pode ser `EM_PREPARO` ao invés de `EM_PRODUCAO`, etc.). Adaptar a nomenclatura para consistência. Se o schema usa `String` em vez de enum, manter como String e validar via código.

### Migration

Se status é enum no Prisma, ajustar o enum. Se é String, não precisa migration — só ajustar validação no código.

## TAREFA 2 — Mapa de Transições Válidas

Criar `packages/backend/src/pedidos/constants/transicoes-pedido.ts`:

```typescript
export const TRANSICOES_VALIDAS: Record<string, string[]> = {
  RASCUNHO:     ['PENDENTE', 'CANCELADO'],
  PENDENTE:     ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO:   ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO:  ['PRONTO', 'CANCELADO'],
  PRONTO:       ['ENTREGUE'],
  ENTREGUE:     [],        // estado final
  CANCELADO:    [],        // estado final
};

export const ESTADOS_PEDIDO = Object.keys(TRANSICOES_VALIDAS);

export const ESTADOS_FINAIS = ['ENTREGUE', 'CANCELADO'];

export function transicaoValida(atual: string, novo: string): boolean {
  const permitidos = TRANSICOES_VALIDAS[atual];
  if (!permitidos) return false;
  return permitidos.includes(novo);
}
```

**Decisão arquitetural:** Objeto literal simples, sem xstate. Testável em 5 linhas, importável no frontend futuramente. Se no futuro precisar sub-estados ou timers, migra para xstate sem breaking changes.

**ATENÇÃO:** Adaptar os nomes dos estados ao que já existe no código. Se hoje usa `EM_PREPARO`, manter ou renomear consistentemente em toda a codebase.

## TAREFA 3 — Validação de Transição no PedidosService

Modificar o método de atualização de status em `PedidosService`:

```typescript
async atualizarStatus(id: number, novoStatus: string, tenantContext?: TenantContext) {
  const pedido = await this.findOne(id, tenantContext);
  
  if (!transicaoValida(pedido.status, novoStatus)) {
    throw new BadRequestException(
      `Transição inválida: ${pedido.status} → ${novoStatus}. ` +
      `Transições permitidas: ${TRANSICOES_VALIDAS[pedido.status]?.join(', ') || 'nenhuma'}`
    );
  }

  return this.prisma.pedido.update({
    where: { id },
    data: { status: novoStatus },
  });
}
```

**Requisitos:**
- Validar transição ANTES de atualizar no banco
- Mensagem de erro descritiva (estado atual, destino, e opções válidas)
- Respeitar TenantGuard/ownership (usar tenantContext do P43)
- Retornar o pedido atualizado com includes necessários

### Endpoint no Controller

Verificar se já existe um endpoint dedicado para atualizar status. Se não:

```typescript
@Patch(':id/status')
@UseGuards(JwtAuthGuard, TenantGuard, PermissoesGuard)
async atualizarStatus(
  @Param('id') id: string,
  @Body('status') novoStatus: string,
  @Req() req,
) {
  const tenantContext = extractTenant(req);
  return this.pedidosService.atualizarStatus(+id, novoStatus, tenantContext);
}
```

Se já existe um mecanismo de atualização geral (PATCH /:id com body.status), integrar a validação de transição nesse fluxo.

## TAREFA 4 — Regras de Negócio por Papel

Nem todo papel pode fazer todas as transições:

```
CLIENTE_ADMIN / CLIENTE_USUARIO:
  - RASCUNHO → PENDENTE (enviar pedido)
  - RASCUNHO → CANCELADO (descartar rascunho)
  - PENDENTE → CANCELADO (cancelar antes de confirmação)

ADMIN / GERENTE / OPERADOR (INTERNO):
  - PENDENTE → CONFIRMADO (aceitar pedido)
  - CONFIRMADO → EM_PRODUCAO (iniciar produção)
  - EM_PRODUCAO → PRONTO (concluir produção)
  - PRONTO → ENTREGUE (registrar entrega)
  - Qualquer → CANCELADO (cancelar em qualquer ponto)
```

**Implementação sugerida:** Adicionar uma segunda validação no service ou guard que verifica o papelTipo do usuário contra as transições permitidas para aquele tipo:

```typescript
export const TRANSICOES_POR_TIPO: Record<string, Record<string, string[]>> = {
  CLIENTE: {
    RASCUNHO: ['PENDENTE', 'CANCELADO'],
    PENDENTE: ['CANCELADO'],
  },
  INTERNO: {
    PENDENTE: ['CONFIRMADO', 'CANCELADO'],
    CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
    EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
    PRONTO: ['ENTREGUE'],
  },
};
```

**Se isso adicionar complexidade excessiva agora**, pode simplificar: INTERNO pode fazer qualquer transição válida, CLIENTE só pode enviar (RASCUNHO→PENDENTE) e cancelar (RASCUNHO/PENDENTE→CANCELADO). Implementar via check simples no service.

## TAREFA 5 — Validação do DTO

Ajustar o DTO de criação de pedido para aceitar status `RASCUNHO` como default:

- Novo pedido criado por CLIENTE → status inicial `RASCUNHO`
- Novo pedido criado por INTERNO → status inicial `PENDENTE` (ou `RASCUNHO`, decidir conforme fizer sentido)
- Validar que o status no create é um estado válido inicial

## TAREFA 6 — Testes

### Testes do mapa de transições (`transicoes-pedido.spec.ts`)
```
✓ transicaoValida retorna true para transições permitidas
✓ transicaoValida retorna false para transições inválidas
✓ transicaoValida retorna false para estado final → qualquer
✓ ESTADOS_FINAIS não têm transições de saída
✓ todos os estados destino existem como chaves no mapa
✓ CANCELADO é acessível de RASCUNHO, PENDENTE, CONFIRMADO, EM_PRODUCAO
✓ PRONTO não pode ir para CANCELADO (só ENTREGUE)
```

### Testes do PedidosService (novos/ajustados)
```
✓ atualizarStatus com transição válida → sucesso
✓ atualizarStatus com transição inválida → BadRequestException
✓ atualizarStatus de estado final → BadRequestException
✓ atualizarStatus respeita ownership (tenant isolation)
✓ create define status RASCUNHO para CLIENTE
✓ create define status PENDENTE para INTERNO (se aplicável)
```

### Testes de restrição por papel (se implementado)
```
✓ CLIENTE pode RASCUNHO → PENDENTE
✓ CLIENTE não pode PENDENTE → CONFIRMADO (ForbiddenException)
✓ INTERNO pode PENDENTE → CONFIRMADO
✓ INTERNO pode qualquer → CANCELADO
```

### Ajustar testes existentes
- Testes que criam pedidos com status fixo devem usar os novos nomes
- Testes de findAll/findOne não devem quebrar

**Target:** ~255+ testes (241 baseline + ~14 novos)

## CRITÉRIOS DE SUCESSO

- [ ] 6 estados de pedido implementados (+ CANCELADO = 7 valores)
- [ ] Mapa de transições `TRANSICOES_VALIDAS` criado e exportado
- [ ] `transicaoValida()` função pura testada
- [ ] `atualizarStatus()` valida transição antes de persistir
- [ ] Mensagem de erro descritiva para transições inválidas
- [ ] Regras por papel implementadas (CLIENTE limitado, INTERNO completo)
- [ ] Status default correto na criação de pedido
- [ ] Todos os testes passando (~255+)
- [ ] Nenhum teste existente quebrado
- [ ] Testes existentes adaptados aos novos nomes de status

## NOTAS IMPORTANTES

- **Não modificar o frontend neste prompt.** Frontend é P48.
- **Verificar os nomes exatos** dos status atuais no schema.prisma e nos services antes de implementar. Se houver divergência, adaptar este prompt ao código.
- **Se status atual é String** (não enum Prisma), manter como String e validar via código — enum Prisma com SQLite pode ser problemático.
- **O mapa de transições será importado pelo frontend** no P48. Exportar de forma limpa (sem dependências NestJS).
- **Commitar ao final** com: `feat(m3): 6 estados pedido, mapa transições, validação status por papel`
