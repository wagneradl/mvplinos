# P43 — cliente_id no JWT + TenantGuard + created_by em Pedido

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. M1 e M2 completos (222 testes).

**RISCO CRÍTICO sendo resolvido:** Tenant isolation ausente. `cliente_id` NÃO está no JWT. Qualquer usuário CLIENTE_* pode ver dados de TODOS os clientes. Este prompt resolve isso.

## PRÉ-FLIGHT (executar antes de qualquer código)

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -5
yarn workspace backend test 2>&1 | tail -20
```

**Se houver mudanças não commitadas do M2:** commitar tudo antes com mensagem descritiva (ex: `feat(m2): UI gestão usuários, papéis, reset senha, vínculo Usuário↔Cliente`). Garantir testes passando ANTES de começar M3.

## TAREFA 1 — Migration: `created_by` em Pedido

Adicionar campo `created_by` no modelo `Pedido` em `packages/backend/prisma/schema.prisma`:

```prisma
model Pedido {
  // ... campos existentes ...
  created_by    Int?
  criador       Usuario?  @relation("PedidosCriados", fields: [created_by], references: [id])
}

model Usuario {
  // ... campos existentes ...
  pedidos_criados Pedido[] @relation("PedidosCriados")
}
```

- Campo **nullable** (backward compatible — pedidos antigos ficam null)
- FK para Usuario
- Rodar `npx prisma migrate dev --name add_created_by_pedido`

## TAREFA 2 — cliente_id no JWT payload

Arquivo: `packages/backend/src/auth/strategies/jwt.strategy.ts`

No método `validate()`, o payload do JWT precisa incluir `clienteId` do usuário. Isso requer:

1. No `AuthService.login()` (ou onde o token é gerado), incluir `clienteId` no payload:
```typescript
// Ao gerar o JWT, buscar o usuario com relação ao cliente
const payload = {
  sub: usuario.id,
  email: usuario.email,
  papel: usuario.papel.nome,
  papelTipo: usuario.papel.tipo, // 'INTERNO' ou 'CLIENTE'
  clienteId: usuario.cliente_id || null, // NOVO
};
```

2. Na `JwtStrategy.validate()`, retornar `clienteId` no request user:
```typescript
async validate(payload: any) {
  return {
    id: payload.sub,
    email: payload.email,
    papel: payload.papel,
    papelTipo: payload.papelTipo,
    clienteId: payload.clienteId, // NOVO
  };
}
```

**ATENÇÃO:** Verificar como o login atual monta o payload. O usuario precisa ser buscado com `include: { papel: true }` para ter acesso a `papel.tipo` (INTERNO vs CLIENTE). Adaptar conforme o código existente — os snippets acima são referência, não copy-paste cego.

## TAREFA 3 — TenantGuard

Criar `packages/backend/src/auth/guards/tenant.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Papéis internos (ADMIN, GERENTE, etc.) passam direto
    if (user.papelTipo === 'INTERNO') {
      return true;
    }

    // Papéis de cliente DEVEM ter clienteId
    if (!user.clienteId) {
      throw new ForbiddenException('Usuário cliente sem vínculo com empresa');
    }

    // Injeta clienteId no request para uso nos services
    request.clienteId = user.clienteId;
    return true;
  }
}
```

**Nota:** Verificar os nomes reais no código. O enum/constantes de tipo de papel pode ser diferente (ex: `nivel` vs `tipo`). Olhar schema.prisma e roles.constants.ts como fonte de verdade. Adaptar o guard conforme encontrado.

## TAREFA 4 — Ownership filtering nos Services

### PedidosService

Modificar os métodos de leitura para filtrar por `clienteId` quando presente:

- `findAll()`: Se `clienteId` presente, adicionar `WHERE cliente_id = clienteId`
- `findOne()`: Após buscar, verificar ownership se `clienteId` presente
- `create()`: Preencher `created_by` com `userId` do request. Se papel CLIENTE, forçar `cliente_id` do JWT (ignorar body)
- `cancel()` / `update()`: Verificar ownership antes de permitir

**Abordagem:** Receber `clienteId` e `userId` como parâmetros nos métodos do service. O controller extrai do `req.user` e `req.clienteId` (injetado pelo TenantGuard). Não acoplar service ao Request.

### ClientesService (mínimo)

- `findOne()`: Se `clienteId` presente, só retornar se id === clienteId
- `findAll()`: Se `clienteId` presente, retornar apenas o próprio cliente

### ProdutosService

Sem filtro de tenant — catálogo global. Nenhuma mudança.

## TAREFA 5 — Aplicar TenantGuard nos Controllers

`@UseGuards(JwtAuthGuard, TenantGuard)` nos controllers tenant-scoped:

- `PedidosController` — todos os endpoints
- `ClientesController` — endpoints de leitura

**Não aplicar** em: ProdutosController, AuthController, UsuariosController.

Ordem importante: JwtAuthGuard ANTES de TenantGuard.

## TAREFA 6 — Testes

### TenantGuard (novos)
- Papel INTERNO → passa sem clienteId
- Papel CLIENTE com clienteId → passa, injeta no request
- Papel CLIENTE sem clienteId → ForbiddenException

### PedidosService (ajustar + novos)
- findAll com clienteId → retorna apenas pedidos do cliente
- findAll sem clienteId (admin) → retorna todos
- findOne com clienteId correto → sucesso
- findOne com clienteId errado → ForbiddenException
- create com papel CLIENTE → created_by preenchido, cliente_id do JWT
- create com papel INTERNO → created_by preenchido, cliente_id do body

### AuthService (ajustar)
- Login retorna JWT com clienteId para usuario CLIENTE_*
- Login retorna JWT com clienteId=null para usuario INTERNO

**Target:** ≥222 testes (manter baseline + novos)

## CRITÉRIOS DE SUCESSO

- [ ] Migration aplicada (created_by em Pedido)
- [ ] JWT contém clienteId para CLIENTE_*, null para INTERNO
- [ ] TenantGuard bloqueia CLIENTE_* sem clienteId
- [ ] TenantGuard permite INTERNO sem restrição
- [ ] PedidosService filtra por clienteId quando presente
- [ ] PedidosService preenche created_by no create
- [ ] Ownership check em findOne/cancel/update
- [ ] Todos os testes passando (≥222)
- [ ] Nenhum teste existente quebrado

## NOTAS IMPORTANTES

- **Não modificar o frontend neste prompt.** Apenas backend.
- **Não alterar estrutura de pastas.** Route groups são P45.
- **Verificar nomes reais** no código antes de implementar — o código em produção é fonte de verdade.
- **Se encontrar discrepâncias** entre este prompt e o código real, adaptar o prompt ao código.
- **Commitar ao final** com: `feat(m3): tenant isolation — TenantGuard, JWT clienteId, created_by em Pedido`
