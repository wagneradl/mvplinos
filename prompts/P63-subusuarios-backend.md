# P63 — Sub-usuários: Validação Backend CLIENTE_ADMIN

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 378 testes passando (commit `2415f38`).

**Objetivo:** Garantir que CLIENTE_ADMIN pode criar e gerenciar sub-usuários (CLIENTE_USUARIO) apenas dentro do seu próprio cliente. Adicionar tenant isolation no UsuariosController e validação de hierarquia no UsuariosService. Decisão D3: CLIENTE_USUARIO pode fazer pedidos e visualizar.

**Estado atual (gaps identificados):**
- `POST /usuarios`: CLIENTE_ADMIN pode chamar, mas NÃO há validação que force `cliente_id` = seu próprio cliente
- `GET /usuarios`: aceita `cliente_id` como query param, mas CLIENTE_ADMIN poderia passar ID de outro cliente
- `GET /usuarios/:id`, `PATCH /usuarios/:id`: sem validação de que o usuário pertence ao mesmo cliente
- Nenhum TenantGuard aplicado no UsuariosController

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 1.8, Seção 3 (E3).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 378 testes passando, working tree limpa.

## TAREFA 1 — Tenant Isolation no UsuariosController

### 1.1 Adicionar TenantGuard

Em `packages/backend/src/usuarios/usuarios.controller.ts`:

Adicionar `TenantGuard` ao controller (mesmo pattern de PedidosController):

```typescript
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissoesGuard)
```

Isso injeta `req.clienteId` para usuários CLIENTE (extraído do JWT).

### 1.2 Passar clienteId nos métodos

Atualizar as rotas para passar `req.clienteId` ao service:

- `create()`: passar `req.clienteId` como contexto
- `findAll()`: se `req.clienteId` existe, ignorar query param e usar o do JWT (segurança)
- `findOne()`: passar `req.clienteId` para validação de pertencimento
- `update()`: passar `req.clienteId` para validação de pertencimento
- `remove()`: passar `req.clienteId` para validação de pertencimento (CLIENTE_ADMIN pode desativar sub-usuários? Decidir — sugestão: SIM, pode desativar CLIENTE_USUARIO do seu cliente)

Injetar `@Req() req` nos métodos que precisam.

## TAREFA 2 — Validações no UsuariosService

### 2.1 Validação no create()

Quando chamado por CLIENTE_ADMIN (detectar via `callerClienteId` presente):

1. **Forçar `cliente_id`:** Se o caller tem `clienteId`, o novo usuário DEVE pertencer ao mesmo cliente. Ignorar qualquer `cliente_id` enviado no body e usar o do caller.

2. **Restringir papel:** CLIENTE_ADMIN só pode criar usuários com papel tipo CLIENTE e nível MENOR que o seu (nível 30). Na prática: só pode criar CLIENTE_USUARIO (nível 10). Se tentar criar CLIENTE_ADMIN ou papel INTERNO → `ForbiddenException('Sem permissão para criar usuários com este papel')`.

3. **Implementação sugerida:** Adicionar parâmetro opcional ao `create()`:

```typescript
async create(createUsuarioDto: CreateUsuarioDto, callerContext?: { clienteId: number; papelNivel: number }) {
  if (callerContext?.clienteId) {
    // Forçar cliente_id do caller
    createUsuarioDto.cliente_id = callerContext.clienteId;
    
    // Verificar que o papel é CLIENTE e nível menor
    const papel = await this.prisma.papel.findUnique({ where: { id: createUsuarioDto.papel_id } });
    if (papel.tipo !== 'CLIENTE' || papel.nivel >= callerContext.papelNivel) {
      throw new ForbiddenException('Sem permissão para criar usuários com este papel');
    }
  }
  // ... resto do create existente
}
```

### 2.2 Validação no findAll()

Quando `callerClienteId` presente: SEMPRE filtrar por ele, independente do query param.

```typescript
async findAll(clienteId?: number, callerClienteId?: number) {
  const effectiveClienteId = callerClienteId || clienteId;
  // ... usar effectiveClienteId no where
}
```

### 2.3 Validação no findOne() e update()

Quando `callerClienteId` presente: após buscar o usuário, verificar que `usuario.cliente_id === callerClienteId`. Se não → `ForbiddenException('Acesso negado a este usuário')`.

### 2.4 Validação no remove()

Quando `callerClienteId` presente:
- Verificar que o usuário pertence ao mesmo cliente
- CLIENTE_ADMIN NÃO pode desativar a si mesmo
- CLIENTE_ADMIN NÃO pode desativar outro CLIENTE_ADMIN (apenas CLIENTE_USUARIO)

### 2.5 Permissões no seed

Verificar e garantir que o papel CLIENTE_ADMIN no seed tem:
```json
{
  "usuarios": ["listar", "ver", "criar", "editar"]
}
```

E o CLIENTE_USUARIO tem:
```json
{
  "usuarios": []  // ou ausente — não gerencia usuários
}
```

**Se o seed já estiver correto, não alterar.** Se precisar ajustar permissões, atualizar o seed.

## TAREFA 3 — Endpoint para listar papéis disponíveis

### 3.1 Filtrar papéis por contexto

O endpoint `GET /usuarios/papeis` retorna TODOS os papéis. Para o portal, CLIENTE_ADMIN só precisa ver papéis tipo CLIENTE com nível menor que o seu.

Opção A (preferida): Adicionar query param `?tipo=CLIENTE` ao `findPapeis()`.
Opção B: O frontend filtra localmente.

Implementar **Opção A** — adicionar filtro opcional:

```typescript
async findPapeis(tipo?: string) {
  const where: any = {};
  if (tipo) where.tipo = tipo;
  // ...
}
```

## TAREFA 4 — Testes

### 4.1 Testes de tenant isolation no create

Em `packages/backend/src/usuarios/usuarios.service.spec.ts`:

1. CLIENTE_ADMIN cria CLIENTE_USUARIO do seu cliente → sucesso, `cliente_id` forçado
2. CLIENTE_ADMIN tenta criar CLIENTE_ADMIN → `ForbiddenException`
3. CLIENTE_ADMIN tenta criar papel INTERNO → `ForbiddenException`
4. CLIENTE_ADMIN tenta criar com `cliente_id` de outro cliente → `cliente_id` é sobrescrito pelo do caller
5. Admin (sem callerContext) cria qualquer papel → sucesso (comportamento existente mantido)

### 4.2 Testes de tenant isolation no findAll

6. CLIENTE_ADMIN chama findAll → retorna apenas usuários do seu cliente
7. CLIENTE_ADMIN passa `cliente_id` de outro cliente no query → ignorado, usa o do JWT
8. Admin sem clienteId → retorna todos (comportamento existente)

### 4.3 Testes de tenant isolation no findOne/update

9. CLIENTE_ADMIN busca usuário do seu cliente → sucesso
10. CLIENTE_ADMIN busca usuário de outro cliente → `ForbiddenException`
11. CLIENTE_ADMIN edita usuário do seu cliente → sucesso
12. CLIENTE_ADMIN edita usuário de outro cliente → `ForbiddenException`

### 4.4 Testes de remove

13. CLIENTE_ADMIN desativa CLIENTE_USUARIO do seu cliente → sucesso
14. CLIENTE_ADMIN desativa usuário de outro cliente → `ForbiddenException`
15. CLIENTE_ADMIN desativa a si mesmo → `ForbiddenException` ou `BadRequestException`

### 4.5 Controller tests

16. Delegação com `req.clienteId` sendo passado ao service

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes
yarn workspace backend test 2>&1 | tail -10

# 2. Build
yarn workspace backend build 2>&1 | tail -5

# 3. Git
git add -A
git status
git commit -m "feat(usuarios): tenant isolation + CLIENTE_ADMIN sub-user restrictions

- Add TenantGuard to UsuariosController
- CLIENTE_ADMIN can only create CLIENTE_USUARIO for own client
- Force cliente_id from JWT (ignore body value)
- Restrict papel by type (CLIENTE only) and level (< caller)
- Tenant isolation on findAll, findOne, update, remove
- CLIENTE_ADMIN cannot deactivate self or other admins
- Filter papeis by tipo query param

Decision D3: CLIENTE_USUARIO can create orders
refs: M4-F3, E3-backend"
```

## CONTAGEM ESPERADA

- Testes anteriores: 378
- Novos testes estimados: ~14-16
- **Meta: 392+ testes passando**

## RESTRIÇÕES

- NÃO alterar o comportamento para usuários INTERNO/ADMIN — apenas adicionar restrições para CLIENTE
- NÃO criar nova migration
- NÃO alterar lógica de login ou auth
- NÃO implementar frontend (será P64)
- Manter backwards compatibility: `create()` sem callerContext funciona como antes
